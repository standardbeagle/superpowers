import { test, expect } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("GET /api/help returns the screen-format reference", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try {
    const res = await fetch(`${ctl.url}/api/help`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    const body = await res.text();
    expect(body).toContain("Screen Format");
  } finally {
    await stopRunning(ctl);
    rmSync(dir, { recursive: true, force: true });
  }
});
