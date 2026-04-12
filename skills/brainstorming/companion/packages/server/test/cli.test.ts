import { test, expect } from "bun:test";
import { parseCliArgs } from "../src/cli";

test("parses start with session-dir", () => {
  const opts = parseCliArgs(["start", "--session-dir", "/tmp/s1"]);
  expect(opts.command).toBe("start");
  expect(opts.sessionDir).toBe("/tmp/s1");
});

test("errors when session-dir missing", () => {
  expect(() => parseCliArgs(["start"])).toThrow(/session-dir/);
});

test("collects multiple doc-roots", () => {
  const opts = parseCliArgs(["start", "--session-dir", "/tmp/s1", "--doc-root", "./a", "--doc-root", "./b"]);
  expect(opts.docRoots).toHaveLength(2);
});
