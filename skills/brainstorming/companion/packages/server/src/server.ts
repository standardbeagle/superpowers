import { ensureSessionDir, writeServerInfo, clearServerInfo, resetSessionDir } from "./session";
import { createScreensRepo } from "./screens-repo";
import { createWsHub } from "./ws";
import { createEventsWriter } from "./events-writer";
import { createIdempotencyStore } from "./idempotency";
import { createDecisionsRepo } from "./decisions-repo";
import { handle, flushAllDemo, type RouteCtx } from "./routes";
import type { Server } from "bun";

export interface CliOptions {
  command: "start" | "stop";
  sessionDir: string;
  docRoots: string[];
  host: string;
  port: number | undefined;
  urlHost: string | undefined;
  foreground: boolean;
  emitNavigate: boolean;
  reset?: boolean;
}

export interface RunningServer {
  url: string;
  port: number;
  server: Server;
  sessionDir: string;
  shutdown: () => Promise<void>;
}

export async function runStart(opts: CliOptions): Promise<RunningServer> {
  if (opts.reset) resetSessionDir(opts.sessionDir);
  ensureSessionDir(opts.sessionDir);

  const screens = await createScreensRepo(opts.sessionDir);
  const broadcast = createWsHub();
  const events = createEventsWriter(opts.sessionDir, { rotateBytes: 10_000_000 });
  const idempotency = createIdempotencyStore();
  const decisions = createDecisionsRepo(opts.sessionDir);
  const ctx: RouteCtx = { screens, broadcast, events, idempotency, decisions, docRoots: opts.docRoots };
  screens.onChange((kind, id) => {
    broadcast.push("refresh", { kind: "screen", id, action: kind });
  });

  const server = Bun.serve({
    hostname: opts.host,
    port: opts.port ?? 0,
    fetch(req, srv) {
      const url = new URL(req.url);
      if (req.method === "GET" && url.pathname === "/api/stream") {
        return broadcast.tryUpgrade(req, srv);
      }
      return handle(req, ctx);
    },
    websocket: {
      open(ws) { broadcast.open(ws); },
      close(ws) { broadcast.close(ws); },
      message() { /* client→server frames unused in v1 */ },
    },
  });

  const urlHost = opts.urlHost ?? opts.host;
  const url = `http://${urlHost}:${server.port}`;
  const info = { url, port: server.port, pid: process.pid, session_dir: opts.sessionDir };
  writeServerInfo(opts.sessionDir, info);
  process.stdout.write(JSON.stringify({ type: "server_ready", ...info }) + "\n");

  let shuttingDown = false;
  const shutdown = async (reason: string = "stopped") => {
    if (shuttingDown) return;
    shuttingDown = true;
    // Tell any connected clients we are going away, then give them a brief
    // window to paint the "shutting down" screen before we close sockets.
    broadcast.push("shutdown", { reason });
    await new Promise(r => setTimeout(r, 1500));
    await flushAllDemo(ctx);
    broadcast.closeAll();
    await screens.close();
    clearServerInfo(opts.sessionDir, reason);
    server.stop(true);
  };

  ctx.shutdown = shutdown;

  process.on("SIGTERM", () => { void shutdown("stopped").then(() => process.exit(0)); });
  process.on("SIGINT",  () => { void shutdown("interrupted").then(() => process.exit(0)); });

  return { url, port: server.port, server, sessionDir: opts.sessionDir, shutdown };
}

export async function stopRunning(ctl: RunningServer): Promise<void> {
  await ctl.shutdown();
}

export async function runStop(opts: CliOptions): Promise<void> {
  const { readFileSync, existsSync } = await import("fs");
  const { join } = await import("path");
  const info = join(opts.sessionDir, "server-info");
  if (!existsSync(info)) {
    console.error("no running server at", opts.sessionDir);
    return;
  }
  const { pid } = JSON.parse(readFileSync(info, "utf8"));
  process.kill(pid, "SIGTERM");
}
