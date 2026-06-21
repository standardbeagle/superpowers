import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";
import { createAnswersRepo } from "../src/answers-repo";

async function withServer(fn: (url: string, dir: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try { await fn(ctl.url, dir); } finally { await stopRunning(ctl); rmSync(dir, { recursive: true, force: true }); }
}

test("GET /api/answers/:id returns the latest submitted inputs (rehydration)", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: T\ninputs:\n  - {type: radio, name: target, options: [a, b]}\n  - {type: text,  name: secret, private: true}\n---\n`);
    await new Promise(r => setTimeout(r, 400));

    expect((await fetch(`${url}/api/answers/s1`)).status).toBe(404); // nothing yet

    await fetch(`${url}/api/answer`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: "s1", client_submission_id: "c1", inputs: { target: "b", secret: "hunter2" } }),
    });

    const res = await fetch(`${url}/api/answers/s1`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.inputs.target).toBe("b");
    expect(json.inputs.secret).toBeUndefined(); // private inputs never rehydrated
  });
});

test("GET /api/screens marks answered screens", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: T\ninputs:\n  - {type: radio, name: target, options: [a, b]}\n---\n`);
    await new Promise(r => setTimeout(r, 400));

    let list = await (await fetch(`${url}/api/screens`)).json();
    expect(list.find((s: any) => s.id === "s1").answered).toBe(false);

    await fetch(`${url}/api/answer`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: "s1", client_submission_id: "c1", inputs: { target: "a" } }),
    });

    list = await (await fetch(`${url}/api/screens`)).json();
    expect(list.find((s: any) => s.id === "s1").answered).toBe(true);
  });
});

test("answers repo replays events.jsonl on startup (survives restart)", () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-replay-"));
  try {
    writeFileSync(join(dir, "events.jsonl"),
      `{"type":"answer","screen_id":"x","inputs":{"a":1}}\n` +
      `{"type":"answer","screen_id":"x","inputs":{"a":2}}\n` +   // later answer wins
      `not-json-skip-me\n` +
      `{"type":"decision","id":"d","status":"approved"}\n`);
    const repo = createAnswersRepo(dir);
    expect(repo.get("x")).toEqual({ a: 2 });
    expect(repo.get("missing")).toBeUndefined();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
