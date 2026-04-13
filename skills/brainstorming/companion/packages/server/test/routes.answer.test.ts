import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

async function withServer(fn: (url: string, dir: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try { await fn(ctl.url, dir); } finally { await stopRunning(ctl); rmSync(dir, { recursive: true, force: true }); }
}

test("POST /api/answer appends an answer event excluding private inputs", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: T\ninputs:\n  - {type: radio, name: target, options: [a, b]}\n  - {type: text,  name: notes}\n  - {type: text,  name: secret, private: true}\n---\n`);
    // wait for watcher to pick it up
    await new Promise(r => setTimeout(r, 400));
    const res = await fetch(`${url}/api/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        screen_id: "s1",
        client_submission_id: "cs1",
        inputs: { target: "a", notes: "looks good", secret: "hunter2" },
      }),
    });
    expect(res.status).toBe(200);
    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean);
    const ev = JSON.parse(lines[lines.length - 1]!);
    expect(ev.type).toBe("answer");
    expect(ev.inputs.target).toBe("a");
    expect(ev.inputs.notes).toBe("looks good");
    expect(ev.inputs.secret).toBeUndefined();
  });
});

test("idempotent: repeated submission for the same client_submission_id only appends once", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: T\ninputs:\n  - {type: text, name: notes}\n---\n`);
    await new Promise(r => setTimeout(r, 400));
    const body = JSON.stringify({ screen_id: "s1", client_submission_id: "dup", inputs: { notes: "a" } });
    await fetch(`${url}/api/answer`, { method: "POST", headers: { "content-type": "application/json" }, body });
    await fetch(`${url}/api/answer`, { method: "POST", headers: { "content-type": "application/json" }, body });
    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean);
    const answers = lines.map(l => JSON.parse(l)).filter(e => e.type === "answer");
    expect(answers).toHaveLength(1);
  });
});
