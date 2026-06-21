import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ensureSessionDir, writeServerInfo, clearServerInfo, resetSessionDir } from "../src/session";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "comp-"));
});

test("ensureSessionDir creates required subdirs and events.jsonl", () => {
  ensureSessionDir(dir);
  expect(existsSync(join(dir, "screens"))).toBe(true);
  expect(existsSync(join(dir, "decisions"))).toBe(true);
  expect(existsSync(join(dir, "events.jsonl"))).toBe(true);
});

test("writeServerInfo writes JSON and clearServerInfo removes it", () => {
  ensureSessionDir(dir);
  writeServerInfo(dir, { url: "http://x", port: 1, pid: 2, session_dir: dir });
  expect(JSON.parse(readFileSync(join(dir, "server-info"), "utf8")).port).toBe(1);
  clearServerInfo(dir);
  expect(existsSync(join(dir, "server-info"))).toBe(false);
  expect(existsSync(join(dir, "server-stopped"))).toBe(true);
});

test("resetSessionDir wipes screens, decisions, events.jsonl, and rotated logs", () => {
  ensureSessionDir(dir);
  writeFileSync(join(dir, "screens", "s.md"), "# s");
  writeFileSync(join(dir, "decisions", "d.md"), "# d");
  writeFileSync(join(dir, "events.jsonl"), '{"seq":0}\n');
  writeFileSync(join(dir, "events-1776088000000.jsonl"), '{"seq":99}\n');

  resetSessionDir(dir);

  expect(existsSync(join(dir, "screens"))).toBe(false);
  expect(existsSync(join(dir, "decisions"))).toBe(false);
  expect(existsSync(join(dir, "events.jsonl"))).toBe(false);
  expect(existsSync(join(dir, "events-1776088000000.jsonl"))).toBe(false);
});

test("resetSessionDir is a no-op on an empty/missing directory", () => {
  expect(() => resetSessionDir(dir)).not.toThrow();
});
