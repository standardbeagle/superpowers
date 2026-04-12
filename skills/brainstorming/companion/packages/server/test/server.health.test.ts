import { test, expect } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("health route returns ok", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({
    command: "start", sessionDir: dir, docRoots: [],
    host: "127.0.0.1", port: 0, urlHost: undefined,
    foreground: true, emitNavigate: false,
  });
  try {
    const res = await fetch(`${ctl.url}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  } finally {
    await stopRunning(ctl);
    rmSync(dir, { recursive: true, force: true });
  }
});
