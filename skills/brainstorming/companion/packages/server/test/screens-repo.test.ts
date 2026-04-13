import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createScreensRepo } from "../src/screens-repo";
import { ensureSessionDir } from "../src/session";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "comp-")); ensureSessionDir(dir); });

test("list returns parsed screens", async () => {
  writeFileSync(join(dir, "screens", "deploy.md"),
    `---\nkind: question\nid: deploy\ntitle: Deploy?\ninputs:\n  - {type: radio, name: t, options: [a, b]}\n---\n\nBody`);
  const repo = await createScreensRepo(dir);
  try {
    const list = repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].frontmatter.id).toBe("deploy");
    expect(list[0].body.trim()).toBe("Body");
  } finally { await repo.close(); }
});

test("get returns the named screen", async () => {
  writeFileSync(join(dir, "screens", "deploy.md"),
    `---\nkind: question\nid: deploy\ntitle: Deploy?\ninputs:\n  - {type: radio, name: t, options: [a, b]}\n---\n`);
  const repo = await createScreensRepo(dir);
  try {
    const s = repo.get("deploy");
    expect(s?.frontmatter.title).toBe("Deploy?");
  } finally { await repo.close(); }
});

test("fires change events when a screen is added", async () => {
  const repo = await createScreensRepo(dir);
  const events: string[] = [];
  repo.onChange((kind, id) => events.push(`${kind}:${id}`));
  try {
    writeFileSync(join(dir, "screens", "new.md"),
      `---\nkind: question\nid: new\ntitle: New?\ninputs:\n  - {type: text, name: n}\n---\n`);
    // Poll for chokidar to fire; WSL2 polling watcher under suite load is variable
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && !events.includes("add:new")) {
      await new Promise(r => setTimeout(r, 50));
    }
    expect(events).toContain("add:new");
  } finally { await repo.close(); }
});
