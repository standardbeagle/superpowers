import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("question → answer → decision approve round-trip", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-integration-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try {
    writeFileSync(join(dir, "screens", "q1.md"),
      `---\nkind: question\nid: q1\ntitle: Q\ninputs:\n  - {type: radio, name: t, options: [a, b]}\n---\n`);
    writeFileSync(join(dir, "decisions", "d1.md"),
      `---\nkind: decision\nid: d1\ntitle: D\nstatus: proposed\noptions:\n  - {id: x, label: X}\n  - {id: y, label: Y}\n---\n`);
    await new Promise(r => setTimeout(r, 500));

    // Step 1: list
    expect(await (await fetch(`${ctl.url}/api/screens`)).json()).toHaveLength(1);
    expect(await (await fetch(`${ctl.url}/api/decisions`)).json()).toHaveLength(1);

    // Step 2: answer
    const ar = await fetch(`${ctl.url}/api/answer`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: "q1", client_submission_id: "cs-1", inputs: { t: "a" } }),
    });
    expect(ar.status).toBe(200);

    // Step 3: decision approve
    const dr = await fetch(`${ctl.url}/api/decisions/d1`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved", chosen_option: "x", note: "looks right" }),
    });
    expect(dr.status).toBe(200);

    // Step 4: check events.jsonl
    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
    expect(lines.find(l => l.type === "answer"   && l.screen_id === "q1")).toBeTruthy();
    expect(lines.find(l => l.type === "decision" && l.id === "d1" && l.status === "approved")).toBeTruthy();

    // Step 5: decision file actually mutated
    expect(readFileSync(join(dir, "decisions", "d1.md"), "utf8")).toContain("status: approved");
  } finally {
    await stopRunning(ctl);
    rmSync(dir, { recursive: true, force: true });
  }
});
