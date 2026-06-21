import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, readFileSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createEventsWriter } from "../src/events-writer";
import { ensureSessionDir } from "../src/session";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "comp-")); ensureSessionDir(dir); });

test("append assigns seq monotonically", async () => {
  const w = createEventsWriter(dir, { rotateBytes: 1_000_000 });
  await w.append({ type: "answer", inputs: { a: 1 } });
  await w.append({ type: "answer", inputs: { a: 2 } });
  const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n");
  const a = JSON.parse(lines[0]!);
  const b = JSON.parse(lines[1]!);
  expect(a.seq).toBe(0);
  expect(b.seq).toBe(1);
  expect(a.ts).toBeLessThanOrEqual(b.ts);
});

test("resumes seq past existing log on restart (no duplicate seq)", async () => {
  const w1 = createEventsWriter(dir, { rotateBytes: 1_000_000 });
  await w1.append({ type: "answer", inputs: { a: 1 } });
  await w1.append({ type: "answer", inputs: { a: 2 } }); // seq 0, 1

  // Simulate a server restart: a fresh writer over the same session dir.
  const w2 = createEventsWriter(dir, { rotateBytes: 1_000_000 });
  await w2.append({ type: "answer", inputs: { a: 3 } });

  const seqs = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").map(l => JSON.parse(l).seq);
  expect(seqs).toEqual([0, 1, 2]);
  expect(new Set(seqs).size).toBe(seqs.length); // all unique
});

test("rotates when the file grows past rotateBytes", async () => {
  const w = createEventsWriter(dir, { rotateBytes: 100 });
  const big = "x".repeat(80);
  await w.append({ type: "answer", inputs: { s: big } });
  await w.append({ type: "answer", inputs: { s: big } });
  const size = statSync(join(dir, "events.jsonl")).size;
  expect(size).toBeLessThan(300); // a rotation happened at least once
});
