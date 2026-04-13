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

test("GET /api/decisions/:id returns frontmatter + body", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "decisions", "d2.md"),
      `---\nkind: decision\nid: d2\ntitle: T\nstatus: proposed\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n\n## Context\nSome text`);
    const res = await fetch(`${url}/api/decisions/d2`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.frontmatter.id).toBe("d2");
    expect(body.frontmatter.kind).toBe("decision");
    expect(body.body).toContain("## Context");
    expect(body.body).toContain("Some text");
  });
});

test("GET /api/decisions/:id returns 404 for unknown id", async () => {
  await withServer(async (url, dir) => {
    const res = await fetch(`${url}/api/decisions/nope`);
    expect(res.status).toBe(404);
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

test("POST /api/decisions/:id does not log a duplicate event when nothing changed", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "decisions", "d1.md"),
      `---\nkind: decision\nid: d1\ntitle: T\nstatus: proposed\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n`);

    const body = JSON.stringify({ status: "approved", chosen_option: "a", note: "because" });
    const first  = await fetch(`${url}/api/decisions/d1`, { method: "POST", headers: { "content-type": "application/json" }, body });
    const second = await fetch(`${url}/api/decisions/d1`, { method: "POST", headers: { "content-type": "application/json" }, body });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await second.json()).duplicate).toBe(true);

    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
    const decisionEvents = lines.filter(e => e.type === "decision" && e.id === "d1");
    expect(decisionEvents).toHaveLength(1);
  });
});

test("POST /api/decisions/:id dedupes when body omits note (keep-existing semantic)", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "decisions", "d1.md"),
      `---\nkind: decision\nid: d1\ntitle: T\nstatus: proposed\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n`);
    // first submission writes status+chosen+note
    await fetch(`${url}/api/decisions/d1`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", chosen_option: "a", note: "first pass" }) });
    // second submission re-sends status+chosen but no note — should be deduped
    const res = await fetch(`${url}/api/decisions/d1`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", chosen_option: "a" }) });
    expect((await res.json()).duplicate).toBe(true);
    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
    expect(lines.filter(e => e.type === "decision" && e.id === "d1")).toHaveLength(1);
  });
});

test("POST /api/decisions/:id still logs when note changes between identical status/chosen", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "decisions", "d1.md"),
      `---\nkind: decision\nid: d1\ntitle: T\nstatus: proposed\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n`);

    const base = { status: "approved", chosen_option: "a" };
    await fetch(`${url}/api/decisions/d1`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...base, note: "first" }) });
    await fetch(`${url}/api/decisions/d1`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...base, note: "second" }) });

    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
    const decisionEvents = lines.filter(e => e.type === "decision" && e.id === "d1");
    expect(decisionEvents).toHaveLength(2);
    expect(decisionEvents[0].note).toBe("first");
    expect(decisionEvents[1].note).toBe("second");
  });
});
