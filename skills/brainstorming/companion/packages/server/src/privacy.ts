import { writeFileSync, statSync, chmodSync } from "fs";
import { createHash } from "crypto";
import type { ScreensRepo } from "./screens-repo";

export interface SaveResult { bytes: number; sha256: string; }

export function assertDeclaredPath(screens: ScreensRepo, screenId: string, path: string): void {
  const s = screens.get(screenId);
  if (!s || s.frontmatter.kind !== "question") throw new Error("unknown screen");
  const ok = s.frontmatter.inputs.some(i => i.type === "file-edit" && i.path === path);
  if (!ok) throw new Error("path not declared in screen");
}

export function savePrivate(path: string, contents: string): SaveResult {
  writeFileSync(path, contents);
  try { chmodSync(path, 0o600); } catch { /* best-effort on non-POSIX */ }
  const bytes = statSync(path).size;
  const sha256 = createHash("sha256").update(contents).digest("hex");
  return { bytes, sha256 };
}
