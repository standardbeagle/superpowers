import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createDecisionsRepo } from "../src/decisions-repo";
import { ensureSessionDir } from "../src/session";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "comp-")); ensureSessionDir(dir); });

test("list parses decision files", () => {
  writeFileSync(join(dir, "decisions", "d1.md"),
    `---\nkind: decision\nid: d1\ntitle: T\nstatus: proposed\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n`);
  const repo = createDecisionsRepo(dir);
  const list = repo.list();
  expect(list).toHaveLength(1);
  expect(list[0].id).toBe("d1");
  expect(list[0].status).toBe("proposed");
});

test("list carries depends_on", () => {
  writeFileSync(join(dir, "decisions", "d2.md"),
    `---\nkind: decision\nid: d2\ntitle: T2\nstatus: proposed\ndepends_on: [d1]\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n`);
  const repo = createDecisionsRepo(dir);
  const list = repo.list();
  const d = list.find(x => x.id === "d2");
  expect(d).toBeTruthy();
  expect(d!.depends_on).toEqual(["d1"]);
});

test("updateStatus rewrites only the status field", () => {
  writeFileSync(join(dir, "decisions", "d1.md"),
    `---\nkind: decision\nid: d1\ntitle: T\nstatus: proposed\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n\n## Context\nSome text`);
  const repo = createDecisionsRepo(dir);
  repo.updateStatus("d1", "approved", "a");
  const raw = readFileSync(join(dir, "decisions", "d1.md"), "utf8");
  expect(raw).toContain("status: approved");
  expect(raw).toContain("## Context");
  expect(raw).toContain("Some text");
});
