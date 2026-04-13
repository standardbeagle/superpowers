import { test, expect } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("WebSocket clients receive a shutdown event before the server tears down", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({
    command: "start", sessionDir: dir, docRoots: [],
    host: "127.0.0.1", port: 0, urlHost: undefined,
    foreground: true, emitNavigate: false,
  });
  try {
    const wsUrl = `${ctl.url.replace(/^http/, "ws")}/api/stream`;
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((res, rej) => {
      ws.addEventListener("open", () => res());
      ws.addEventListener("error", () => rej(new Error("ws open failed")));
    });
    const received: any[] = [];
    ws.addEventListener("message", (e) => {
      try { received.push(JSON.parse(e.data)); } catch { /* ignore */ }
    });
    await new Promise(r => setTimeout(r, 50));

    // Trigger the graceful shutdown but don't await — we need to observe the
    // frame before the server finishes closing.
    const stopPromise = stopRunning(ctl);

    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      if (received.find(m => m.event === "shutdown")) break;
      await new Promise(r => setTimeout(r, 20));
    }
    const shutdownFrame = received.find(m => m.event === "shutdown");
    expect(shutdownFrame).toBeTruthy();
    expect(shutdownFrame.data).toBeTruthy();

    await stopPromise;
    try { ws.close(); } catch { /* ignore */ }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("POST /api/shutdown returns ok, reports reason, then runs graceful shutdown", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({
    command: "start", sessionDir: dir, docRoots: [],
    host: "127.0.0.1", port: 0, urlHost: undefined,
    foreground: true, emitNavigate: false,
  });
  try {
    const res = await fetch(`${ctl.url}/api/shutdown`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "test says goodbye" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reason).toBe("test says goodbye");

    // The route scheduled a graceful shutdown via ctx.shutdown — give it time
    // to broadcast + delay + tear down. Our own stopRunning is idempotent via
    // the shuttingDown guard, so awaiting it either observes the scheduled run
    // or no-ops.
    await new Promise(r => setTimeout(r, 1800));
    await stopRunning(ctl);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
