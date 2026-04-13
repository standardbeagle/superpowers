import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

async function withServer(fn: (url: string, dir: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try { await fn(ctl.url, dir); } finally { await stopRunning(ctl); rmSync(dir, { recursive: true, force: true }); }
}

test("private-save writes the file and records a 'saved' event without contents", async () => {
  await withServer(async (url, dir) => {
    const envPath = join(dir, ".env");
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: T\ninputs:\n  - {type: file-edit, path: ${envPath}, private: true}\n---\n`);
    await new Promise(r => setTimeout(r, 400));

    const CONTENT = "DATABASE_URL=postgres://TOTALLY_FAKE_SECRET_FOR_TESTING@h/x";
    const res = await fetch(`${url}/api/private-save`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: "s1", name: "env", path: envPath, contents: CONTENT }),
    });
    expect(res.status).toBe(200);

    // File written
    expect(readFileSync(envPath, "utf8")).toBe(CONTENT);
    expect((statSync(envPath).mode & 0o777)).toBe(0o600);

    // Event recorded, contents absent
    const lines = readFileSync(join(dir, "events.jsonl"), "utf8");
    expect(lines).toContain('"type":"saved"');
    expect(lines).not.toContain("TOTALLY_FAKE_SECRET_FOR_TESTING");
  });
});

test("private-save rejects a path not declared in any screen", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: T\ninputs:\n  - {type: file-edit, path: ${join(dir, ".env")}, private: true}\n---\n`);
    await new Promise(r => setTimeout(r, 400));

    const res = await fetch(`${url}/api/private-save`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: "s1", name: "env", path: "/etc/passwd", contents: "x" }),
    });
    expect(res.status).toBe(400);
  });
});
