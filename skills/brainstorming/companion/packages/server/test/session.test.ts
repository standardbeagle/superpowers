import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ensureSessionDir, writeServerInfo, clearServerInfo } from "../src/session";

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
