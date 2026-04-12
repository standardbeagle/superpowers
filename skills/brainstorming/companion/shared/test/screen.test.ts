import { test, expect } from "bun:test";
import { ScreenFrontmatter } from "../src/screen";

test("question screen with radio input parses", () => {
  const raw = {
    kind: "question",
    id: "deploy",
    title: "Where are we deploying?",
    inputs: [
      { type: "radio", name: "target", options: ["k8s", "lambda"] },
    ],
  };
  const parsed = ScreenFrontmatter.parse(raw);
  expect(parsed.kind).toBe("question");
  if (parsed.kind === "question") {
    expect(parsed.inputs[0].type).toBe("radio");
  }
});

test("question screen rejects an empty inputs array", () => {
  expect(() =>
    ScreenFrontmatter.parse({ kind: "question", id: "x", title: "x", inputs: [] })
  ).toThrow();
});

test("file-edit must be private: true", () => {
  expect(() =>
    ScreenFrontmatter.parse({
      kind: "question",
      id: "x",
      title: "x",
      inputs: [{ type: "file-edit", path: ".env", private: false }],
    })
  ).toThrow();
});

test("demo screen requires an html source", () => {
  expect(() =>
    ScreenFrontmatter.parse({
      kind: "demo",
      id: "x",
      title: "x",
      demo: { type: "srcdoc" },
      actions: [{ type: "approve", label: "ok" }],
    })
  ).toThrow();
});

test("decision screen with options parses", () => {
  const parsed = ScreenFrontmatter.parse({
    kind: "decision",
    id: "d1",
    title: "Pick one",
    options: [
      { id: "a", label: "A", recommended: true },
      { id: "b", label: "B" },
    ],
  });
  expect(parsed.kind).toBe("decision");
});
