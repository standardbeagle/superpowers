import { readFileSync, readdirSync, writeFileSync, renameSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import { ScreenFrontmatter, type Decision, type DecisionStatus } from "@companion/shared";

export interface DecisionsRepo {
  list(): Decision[];
  get(id: string): Decision | undefined;
  updateStatus(id: string, status: DecisionStatus, chosen?: string, note?: string): void;
}

export function createDecisionsRepo(sessionDir: string): DecisionsRepo {
  const dir = join(sessionDir, "decisions");

  function parse(path: string): Decision | undefined {
    try {
      const raw = readFileSync(path, "utf8");
      const { data } = matter(raw);
      const front = ScreenFrontmatter.parse(data);
      if (front.kind !== "decision") return undefined;
      return { id: front.id, title: front.title, status: front.status, depends_on: front.depends_on, path };
    } catch {
      return undefined;
    }
  }

  function list(): Decision[] {
    return readdirSync(dir)
      .filter(f => f.endsWith(".md"))
      .map(f => parse(join(dir, f)))
      .filter((d): d is Decision => !!d);
  }

  function get(id: string): Decision | undefined {
    return list().find(d => d.id === id);
  }

  function updateStatus(id: string, status: DecisionStatus, chosen?: string, note?: string): void {
    const d = get(id);
    if (!d) throw new Error(`unknown decision ${id}`);
    const raw = readFileSync(d.path, "utf8");
    const parsed = matter(raw);
    parsed.data.status = status;
    if (chosen !== undefined) parsed.data.chosen_option = chosen;
    if (note   !== undefined) parsed.data.note = note;
    const out = matter.stringify(parsed.content, parsed.data);
    const tmp = d.path + ".tmp";
    writeFileSync(tmp, out);
    renameSync(tmp, d.path);
  }

  return { list, get, updateStatus };
}
