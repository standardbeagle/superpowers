import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("SSE pushes refresh event when a screen is added", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try {
    const res = await fetch(`${ctl.url}/api/stream`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    // Give the server a tick to register the client before writing the file
    await new Promise(r => setTimeout(r, 100));
    writeFileSync(join(dir, "screens", "x.md"),
      `---\nkind: question\nid: x\ntitle: X\ninputs:\n  - {type: text, name: n}\n---\n`);

    // Read until we see an event line (may arrive across multiple chunks)
    let buf = "";
    const timed = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("sse timeout")), 5000));
    while (!buf.includes("event: refresh")) {
      const read: Promise<{ value?: Uint8Array; done?: boolean }> = reader.read();
      const { value, done } = await Promise.race([read, timed]) as { value?: Uint8Array; done?: boolean };
      if (done) break;
      if (value) buf += decoder.decode(value);
    }
    expect(buf).toContain("event: refresh");
    expect(buf).toContain("\"kind\":\"screen\"");
    expect(buf).toContain("\"id\":\"x\"");
    reader.cancel();
  } finally {
    await stopRunning(ctl);
    rmSync(dir, { recursive: true, force: true });
  }
});
