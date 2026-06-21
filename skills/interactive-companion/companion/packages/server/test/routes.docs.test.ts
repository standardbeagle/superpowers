import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("GET /api/docs lists registered markdown files", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const docRoot = mkdtempSync(join(tmpdir(), "docs-"));
  mkdirSync(join(docRoot, "sub"));
  writeFileSync(join(docRoot, "README.md"), "# hi");
  writeFileSync(join(docRoot, "sub", "other.md"), "x");
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[docRoot], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try {
    const list = await (await fetch(`${ctl.url}/api/docs`)).json() as Array<{ path: string }>;
    const paths = list.map(e => e.path).sort();
    expect(paths.some(p => p.endsWith("README.md"))).toBe(true);
    expect(paths.some(p => p.endsWith("sub/other.md"))).toBe(true);

    const body = await (await fetch(`${ctl.url}/api/docs/file?path=${encodeURIComponent(join(docRoot, "README.md"))}`)).text();
    expect(body).toContain("# hi");
  } finally {
    await stopRunning(ctl);
    rmSync(dir, { recursive: true, force: true });
    rmSync(docRoot, { recursive: true, force: true });
  }
});
