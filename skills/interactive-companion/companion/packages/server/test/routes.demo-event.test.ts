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

test("consecutive same-name demo events merge into one with merged:N", async () => {
  await withServer(async (url, dir) => {
    // write a minimal demo screen so the server accepts the events
    writeFileSync(join(dir, "screens", "c.md"),
      `---\nkind: demo\nid: c\ntitle: C\ndemo:\n  type: srcdoc\n  inlineHtml: "<button/>"\nactions:\n  - {type: approve, label: ok}\n---\n`);
    await new Promise(r => setTimeout(r, 400));

    for (let i = 1; i <= 5; i++) {
      await fetch(`${url}/api/demo-event`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ screen_id: "c", name: "inc", data: { n: i } }),
      });
    }
    // Wait past the debounce window so the merged event flushes
    await new Promise(r => setTimeout(r, 350));

    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
    const demoEvents = lines.filter(e => e.type === "demo_event" && e.name === "inc");
    expect(demoEvents).toHaveLength(1);
    expect(demoEvents[0].data).toEqual({ n: 5 });
    expect(demoEvents[0].merged).toBe(5);
  });
});

test("different name flushes the prior pending event in arrival order", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "c.md"),
      `---\nkind: demo\nid: c\ntitle: C\ndemo:\n  type: srcdoc\n  inlineHtml: "<button/>"\nactions:\n  - {type: approve, label: ok}\n---\n`);
    await new Promise(r => setTimeout(r, 400));

    for (let i = 1; i <= 3; i++) {
      await fetch(`${url}/api/demo-event`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ screen_id: "c", name: "inc", data: { n: i } }),
      });
    }
    await fetch(`${url}/api/demo-event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: "c", name: "ship", data: { final: 3 } }),
    });
    await new Promise(r => setTimeout(r, 350));

    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
    const demos = lines.filter(e => e.type === "demo_event");
    expect(demos).toHaveLength(2);
    expect(demos[0].name).toBe("inc");
    expect(demos[0].merged).toBe(3);
    expect(demos[0].data).toEqual({ n: 3 });
    expect(demos[1].name).toBe("ship");
    expect(demos[1].data).toEqual({ final: 3 });
    expect(demos[1].merged).toBeUndefined();
  });
});

test("single demo event still lands after the debounce window", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "c.md"),
      `---\nkind: demo\nid: c\ntitle: C\ndemo:\n  type: srcdoc\n  inlineHtml: "<button/>"\nactions:\n  - {type: approve, label: ok}\n---\n`);
    await new Promise(r => setTimeout(r, 400));

    await fetch(`${url}/api/demo-event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: "c", name: "approve", data: { note: "ok" } }),
    });
    await new Promise(r => setTimeout(r, 350));

    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
    const demos = lines.filter(e => e.type === "demo_event");
    expect(demos).toHaveLength(1);
    expect(demos[0].name).toBe("approve");
    expect(demos[0].merged).toBeUndefined();
  });
});
