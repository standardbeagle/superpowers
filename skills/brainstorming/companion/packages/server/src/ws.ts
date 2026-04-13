import type { Server, ServerWebSocket } from "bun";

export interface WsHub {
  /** Call from Bun.serve fetch handler. Returns undefined if the upgrade succeeded
   *  (Bun will take over the socket), or a Response if it failed. */
  tryUpgrade(req: Request, server: Server): Response | undefined;
  open(ws: ServerWebSocket<unknown>): void;
  close(ws: ServerWebSocket<unknown>): void;
  push(event: string, data: unknown): void;
  closeAll(): void;
}

export function createWsHub(): WsHub {
  const clients = new Set<ServerWebSocket<unknown>>();
  return {
    tryUpgrade(req, server) {
      if (server.upgrade(req)) return undefined;
      return new Response("websocket upgrade failed", { status: 400 });
    },
    open(ws) {
      clients.add(ws);
      try { ws.send(JSON.stringify({ event: "connected" })); } catch { /* ignore */ }
    },
    close(ws) {
      clients.delete(ws);
    },
    push(event, data) {
      const msg = JSON.stringify({ event, data });
      for (const ws of clients) {
        try { ws.send(msg); } catch { clients.delete(ws); }
      }
    },
    closeAll() {
      for (const ws of clients) {
        try { ws.close(); } catch { /* ignore */ }
      }
      clients.clear();
    },
  };
}
