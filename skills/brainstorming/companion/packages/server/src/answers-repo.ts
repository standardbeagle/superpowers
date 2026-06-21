import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Latest public answer per screen_id. Seeded by replaying events.jsonl on
// startup (so a server restart keeps prior answers), then updated in-memory on
// each /api/answer. Lets the client rehydrate a screen's selections instead of
// showing a blank form after navigation or reload.
export interface AnswersRepo {
  get(screenId: string): Record<string, unknown> | undefined;
  set(screenId: string, inputs: Record<string, unknown>): void;
  all(): Record<string, Record<string, unknown>>;
}

export function createAnswersRepo(sessionDir: string): AnswersRepo {
  const map = new Map<string, Record<string, unknown>>();
  const path = join(sessionDir, "events.jsonl");

  if (existsSync(path)) {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const ev = JSON.parse(line) as { type?: string; screen_id?: string; inputs?: Record<string, unknown> };
        if (ev.type === "answer" && ev.screen_id && ev.inputs) map.set(ev.screen_id, ev.inputs);
      } catch {
        // skip malformed lines; events.jsonl is append-only and may be mid-write
      }
    }
  }

  return {
    get: (id) => map.get(id),
    set: (id, inputs) => { map.set(id, inputs); },
    all: () => Object.fromEntries(map),
  };
}
