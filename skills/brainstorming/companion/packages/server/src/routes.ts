import type { ScreensRepo } from "./screens-repo";
import type { EventsWriter } from "./events-writer";
import type { IdempotencyStore } from "./idempotency";
import type { DecisionsRepo } from "./decisions-repo";
import { assertDeclaredPath, savePrivate } from "./privacy";
import { existsSync, readdirSync, statSync, readFileSync } from "fs";
import { join, relative, resolve, dirname } from "path";

const WEB_DIST = resolve(import.meta.dir, "..", "..", "web", "dist");
const HELP_MD = resolve(import.meta.dir, "..", "..", "..", "docs", "screen-format.md");

const demoWindow: Array<{ ts: number; screen: string }> = [];
let dropped = 0;

// Merged debounce buffer for demo events. Same (screen_id, name) events within
// 250ms coalesce; a different key flushes the prior one first in arrival order.
interface PendingDemoEvent {
  screen_id: string;
  name: string;
  data: unknown;
  count: number;
  timer: ReturnType<typeof setTimeout>;
}
const pendingDemo = new Map<string, PendingDemoEvent>();  // key = `${screen_id}::${name}`
const DEBOUNCE_MS = 250;

async function flushDemo(key: string, ctx: RouteCtx): Promise<void> {
  const p = pendingDemo.get(key);
  if (!p) return;
  clearTimeout(p.timer);
  pendingDemo.delete(key);
  // Rate-limit safety net (unchanged semantics)
  const now = Date.now();
  demoWindow.push({ ts: now, screen: p.screen_id });
  while (demoWindow.length && now - demoWindow[0]!.ts > 1000) demoWindow.shift();
  const inWindow = demoWindow.filter(e => e.screen === p.screen_id).length;
  if (inWindow > 10) {
    dropped++;
    return;
  }
  if (dropped > 0) {
    await ctx.events.append({ type: "demo_event_throttled", screen_id: p.screen_id, dropped });
    dropped = 0;
  }
  const payload: Record<string, unknown> = {
    type: "demo_event",
    screen_id: p.screen_id,
    name: p.name,
    data: p.data,
  };
  if (p.count > 1) payload.merged = p.count;
  await ctx.events.append(payload);
}

async function flushAllDemoExcept(key: string, ctx: RouteCtx): Promise<void> {
  // Flush any other pending events in insertion order so arrival ordering is preserved
  for (const k of Array.from(pendingDemo.keys())) {
    if (k === key) continue;
    await flushDemo(k, ctx);
  }
}

export async function flushAllDemo(ctx: RouteCtx): Promise<void> {
  for (const k of Array.from(pendingDemo.keys())) await flushDemo(k, ctx);
}

function serveStatic(url: URL): Response | undefined {
  let rel = url.pathname === "/" ? "/index.html" : url.pathname;
  // SPA fallback: any non-api path with no extension falls through to index.html
  if (!rel.startsWith("/api") && !/\.[a-z0-9]+$/i.test(rel)) rel = "/index.html";
  const p = join(WEB_DIST, rel);
  if (!p.startsWith(WEB_DIST) || !existsSync(p)) return undefined;
  const ext = p.slice(p.lastIndexOf(".") + 1);
  const ct = ({ html:"text/html", js:"text/javascript", css:"text/css", svg:"image/svg+xml", map:"application/json" } as Record<string,string>)[ext] ?? "application/octet-stream";
  return new Response(readFileSync(p), { headers: { "content-type": ct } });
}

export interface RouteCtx {
  screens: ScreensRepo;
  broadcast: { push(event: string, data: unknown): void };
  events: EventsWriter;
  idempotency: IdempotencyStore;
  decisions: DecisionsRepo;
  docRoots: string[];
}

function listMarkdown(root: string): string[] {
  const out: string[] = [];
  function walk(d: string) {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (name.endsWith(".md")) out.push(p);
    }
  }
  walk(root);
  return out;
}

function isUnder(root: string, target: string): boolean {
  const rel = relative(root, target);
  return !rel.startsWith("..") && !rel.startsWith("/");
}

export async function handle(req: Request, ctx: RouteCtx): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname === "/api/health") {
    return Response.json({ ok: true });
  }
  if (req.method === "GET" && url.pathname === "/api/screens") {
    return Response.json(ctx.screens.list().map(s => ({
      id: s.frontmatter.id,
      kind: s.frontmatter.kind,
      title: s.frontmatter.title,
      pinned: s.frontmatter.pinned,
    })));
  }
  if (req.method === "GET" && url.pathname.startsWith("/api/screens/")) {
    const id = url.pathname.slice("/api/screens/".length);
    const s = ctx.screens.get(id);
    if (!s) return new Response("not found", { status: 404 });
    return Response.json({ frontmatter: s.frontmatter, body: s.body });
  }
  if (req.method === "POST" && url.pathname === "/api/answer") {
    const body = await req.json().catch(() => null) as {
      screen_id?: string; client_submission_id?: string; inputs?: Record<string, unknown>;
    } | null;
    if (!body?.screen_id || !body.client_submission_id || !body.inputs) {
      return new Response("bad request", { status: 400 });
    }
    const screen = ctx.screens.get(body.screen_id);
    if (!screen || screen.frontmatter.kind !== "question") {
      return new Response("unknown screen", { status: 404 });
    }
    if (ctx.idempotency.seen(body.screen_id, body.client_submission_id)) {
      return Response.json({ ok: true, duplicate: true });
    }
    ctx.idempotency.remember(body.screen_id, body.client_submission_id);

    const publicInputs: Record<string, unknown> = {};
    for (const def of screen.frontmatter.inputs) {
      if ("private" in def && def.private) continue;
      if (def.type === "file-edit") continue;
      const name = def.name;
      if (name && name in body.inputs) publicInputs[name] = body.inputs[name];
    }
    await ctx.events.append({ type: "answer", screen_id: body.screen_id, inputs: publicInputs });
    return Response.json({ ok: true });
  }
  if (req.method === "POST" && url.pathname === "/api/private-save") {
    const body = await req.json().catch(() => null) as {
      screen_id?: string; name?: string; path?: string; contents?: string;
    } | null;
    if (!body?.screen_id || !body.name || !body.path || typeof body.contents !== "string") {
      return new Response("bad request", { status: 400 });
    }
    try {
      assertDeclaredPath(ctx.screens, body.screen_id, body.path);
    } catch (err) {
      return new Response((err as Error).message, { status: 400 });
    }
    try {
      const { bytes, sha256 } = savePrivate(body.path, body.contents);
      await ctx.events.append({
        type: "saved",
        screen_id: body.screen_id,
        name: body.name,
        path: body.path,
        bytes,
        sha256,
      });
      return Response.json({ ok: true, bytes, sha256 });
    } catch (err) {
      const errno = (err as NodeJS.ErrnoException).code ?? "UNKNOWN";
      await ctx.events.append({ type: "save_error", screen_id: body.screen_id, name: body.name, path: body.path, errno });
      return new Response("save failed", { status: 500 });
    }
  }
  if (req.method === "GET" && url.pathname === "/api/decisions") {
    return Response.json(ctx.decisions.list());
  }
  if (req.method === "GET" && url.pathname.startsWith("/api/decisions/")) {
    const id = url.pathname.slice("/api/decisions/".length);
    const d = ctx.decisions.getById(id);
    if (!d) return new Response("not found", { status: 404 });
    return Response.json(d);
  }
  if (req.method === "POST" && url.pathname.startsWith("/api/decisions/")) {
    const id = url.pathname.slice("/api/decisions/".length);
    const body = await req.json().catch(() => null) as {
      status?: "approved"|"revised"|"rejected"|"proposed"; chosen_option?: string; note?: string;
    } | null;
    if (!body?.status) return new Response("bad request", { status: 400 });

    // Dedupe: if the file already matches the incoming tuple exactly, do not
    // rewrite and do not append a duplicate event. An undefined field on the
    // request body means "keep existing" (the updateStatus path skips undefined
    // too), so from a dedupe perspective that dimension always matches.
    const current = ctx.decisions.list().find(d => d.id === id);
    const sameStatus = current?.status === body.status;
    const sameChosen = body.chosen_option === undefined || current?.chosen_option === body.chosen_option;
    const sameNote   = body.note          === undefined || current?.note          === body.note;
    if (current && sameStatus && sameChosen && sameNote) {
      return Response.json({ ok: true, duplicate: true });
    }

    try {
      ctx.decisions.updateStatus(id, body.status, body.chosen_option, body.note);
    } catch (err) {
      return new Response((err as Error).message, { status: 404 });
    }
    await ctx.events.append({ type: "decision", id, status: body.status, chosen_option: body.chosen_option, note: body.note });
    ctx.broadcast.push("refresh", { kind: "decision", id });
    return Response.json({ ok: true });
  }
  if (req.method === "GET" && url.pathname === "/api/docs") {
    const out: Array<{ root: string; path: string; rel: string }> = [];
    for (const root of ctx.docRoots) {
      for (const p of listMarkdown(root)) {
        out.push({ root, path: p, rel: relative(root, p) });
      }
    }
    return Response.json(out);
  }
  if (req.method === "GET" && url.pathname === "/api/docs/file") {
    const p = url.searchParams.get("path");
    if (!p || !ctx.docRoots.some(r => isUnder(r, p))) {
      return new Response("forbidden", { status: 403 });
    }
    return new Response(readFileSync(p, "utf8"), { headers: { "content-type": "text/markdown" } });
  }

  if (req.method === "GET" && url.pathname === "/api/demo-asset") {
    const sid = url.searchParams.get("screen_id");
    const file = url.searchParams.get("file");
    if (!sid || !file) return new Response("bad request", { status: 400 });
    const s = ctx.screens.get(sid);
    if (!s || s.frontmatter.kind !== "demo") return new Response("not found", { status: 404 });
    const base = dirname(s.path);
    const target = resolve(base, file);
    if (relative(base, target).startsWith("..")) return new Response("forbidden", { status: 403 });
    if (!existsSync(target)) return new Response("not found", { status: 404 });
    return new Response(readFileSync(target, "utf8"));
  }

  if (req.method === "GET" && url.pathname === "/api/help") {
    if (!existsSync(HELP_MD)) return new Response("help file not found", { status: 404 });
    return new Response(readFileSync(HELP_MD, "utf8"), { headers: { "content-type": "text/markdown" } });
  }

  if (req.method === "POST" && url.pathname === "/api/demo-event") {
    const body = await req.json().catch(() => null) as { screen_id?: string; name?: string; data?: unknown } | null;
    if (!body?.screen_id || !body.name) return new Response("bad request", { status: 400 });
    const key = `${body.screen_id}::${body.name}`;

    // Any different (screen_id, name) that has pending work flushes first
    await flushAllDemoExcept(key, ctx);

    const existing = pendingDemo.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      existing.data = body.data;
      existing.count += 1;
      existing.timer = setTimeout(() => { void flushDemo(key, ctx); }, DEBOUNCE_MS);
    } else {
      const p: PendingDemoEvent = {
        screen_id: body.screen_id,
        name: body.name,
        data: body.data,
        count: 1,
        timer: setTimeout(() => { void flushDemo(key, ctx); }, DEBOUNCE_MS),
      };
      pendingDemo.set(key, p);
    }
    return Response.json({ ok: true, pending: true });
  }

  const asset = serveStatic(url);
  if (asset) return asset;
  return new Response("not found", { status: 404 });
}
