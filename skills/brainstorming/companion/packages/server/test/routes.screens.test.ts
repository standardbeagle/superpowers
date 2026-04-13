import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

async function withServer(fn: (url: string, dir: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try { await fn(ctl.url, dir); } finally { await stopRunning(ctl); rmSync(dir, { recursive: true, force: true }); }
}

test("GET /api/screens lists parsed screens", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: One\ninputs:\n  - {type: text, name: n}\n---\nHello`);
    // allow chokidar watcher to settle
    await new Promise(r => setTimeout(r, 400));
    const list = await (await fetch(`${url}/api/screens`)).json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("s1");
    expect(list[0].kind).toBe("question");
    expect(list[0].title).toBe("One");
  });
});

test("GET /api/screens/:id returns body + frontmatter", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: One\ninputs:\n  - {type: text, name: n}\n---\n# Hello`);
    await new Promise(r => setTimeout(r, 400));
    const s = await (await fetch(`${url}/api/screens/s1`)).json();
    expect(s.frontmatter.id).toBe("s1");
    expect(s.body).toContain("# Hello");
  });
});
