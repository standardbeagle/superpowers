import { appendFileSync, statSync, renameSync, closeSync, openSync, existsSync, readFileSync } from "fs";
import { join } from "path";

export interface EventsWriter {
  append(ev: Record<string, unknown>): Promise<void>;
  nextSeq(): number;
}

// Resume the seq counter past the highest seq already in events.jsonl so a
// server restart doesn't emit duplicate seq numbers into the same log.
function seedSeq(path: string): number {
  if (!existsSync(path)) return 0;
  let max = -1;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const s = (JSON.parse(line) as { seq?: number }).seq;
      if (typeof s === "number" && s > max) max = s;
    } catch {
      // skip malformed lines
    }
  }
  return max + 1;
}

export function createEventsWriter(sessionDir: string, opts: { rotateBytes: number }): EventsWriter {
  const path = join(sessionDir, "events.jsonl");
  let seq = seedSeq(path);

  function maybeRotate() {
    try {
      const size = statSync(path).size;
      if (size >= opts.rotateBytes) {
        const ts = Date.now();
        renameSync(path, join(sessionDir, `events-${ts}.jsonl`));
        closeSync(openSync(path, "a"));
      }
    } catch {
      closeSync(openSync(path, "a"));
    }
  }

  return {
    nextSeq: () => seq++,
    async append(ev) {
      maybeRotate();
      const line = JSON.stringify({ ts: Date.now(), seq: seq++, ...ev }) + "\n";
      appendFileSync(path, line);
    },
  };
}
