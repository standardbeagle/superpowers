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

test("GET /api/decisions lists decisions", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "decisions", "d1.md"),
      `---\nkind: decision\nid: d1\ntitle: T\nstatus: proposed\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n`);
    const list = await (await fetch(`${url}/api/decisions`)).json();
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("proposed");
  });
});

test("POST /api/decisions/:id updates status and appends event", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "decisions", "d1.md"),
      `---\nkind: decision\nid: d1\ntitle: T\nstatus: proposed\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n`);
    const res = await fetch(`${url}/api/decisions/d1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved", chosen_option: "a" }),
    });
    expect(res.status).toBe(200);

    // File updated
    expect(readFileSync(join(dir, "decisions", "d1.md"), "utf8")).toContain("status: approved");
    // Event logged
    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean);
    const ev = JSON.parse(lines[lines.length - 1]!);
    expect(ev.type).toBe("decision");
    expect(ev.id).toBe("d1");
    expect(ev.status).toBe("approved");
  });
});
