import type { ScreensRepo } from "./screens-repo";
import type { SseHub } from "./sse";
import type { EventsWriter } from "./events-writer";
import type { IdempotencyStore } from "./idempotency";
import type { DecisionsRepo } from "./decisions-repo";
import { assertDeclaredPath, savePrivate } from "./privacy";

export interface RouteCtx {
  screens: ScreensRepo;
  sse: SseHub;
  events: EventsWriter;
  idempotency: IdempotencyStore;
  decisions: DecisionsRepo;
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
  if (req.method === "GET" && url.pathname === "/api/stream") {
    return ctx.sse.handle(req);
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
  if (req.method === "POST" && url.pathname.startsWith("/api/decisions/")) {
    const id = url.pathname.slice("/api/decisions/".length);
    const body = await req.json().catch(() => null) as {
      status?: "approved"|"revised"|"rejected"|"proposed"; chosen_option?: string; note?: string;
    } | null;
    if (!body?.status) return new Response("bad request", { status: 400 });
    try {
      ctx.decisions.updateStatus(id, body.status, body.chosen_option, body.note);
    } catch (err) {
      return new Response((err as Error).message, { status: 404 });
    }
    await ctx.events.append({ type: "decision", id, status: body.status, chosen_option: body.chosen_option, note: body.note });
    ctx.sse.push("refresh", { kind: "decision", id });
    return Response.json({ ok: true });
  }
  return new Response("not found", { status: 404 });
}
