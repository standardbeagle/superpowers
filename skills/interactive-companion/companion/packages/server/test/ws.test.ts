import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("WebSocket /api/stream pushes a refresh message when a screen is added", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
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

    // Give the server a tick before writing the screen so the open message lands first
    await new Promise(r => setTimeout(r, 50));

    writeFileSync(join(dir, "screens", "x.md"),
      `---\nkind: question\nid: x\ntitle: X\ninputs:\n  - {type: text, name: n}\n---\n`);

    // Poll for the refresh frame
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (received.find(m => m.event === "refresh" && m.data?.id === "x" && m.data?.kind === "screen")) break;
      await new Promise(r => setTimeout(r, 50));
    }
    expect(received.find(m => m.event === "refresh" && m.data?.id === "x")).toBeTruthy();

    ws.close();
  } finally {
    await stopRunning(ctl);
    rmSync(dir, { recursive: true, force: true });
  }
});
