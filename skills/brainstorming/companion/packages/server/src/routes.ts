import type { ScreensRepo } from "./screens-repo";

export interface RouteCtx {
  screens: ScreensRepo;
}

export function handle(req: Request, ctx: RouteCtx): Response | Promise<Response> {
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
  return new Response("not found", { status: 404 });
}
