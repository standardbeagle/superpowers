import { appendFileSync, statSync, renameSync, closeSync, openSync } from "fs";
import { join } from "path";

export interface EventsWriter {
  append(ev: Record<string, unknown>): Promise<void>;
  nextSeq(): number;
}

export function createEventsWriter(sessionDir: string, opts: { rotateBytes: number }): EventsWriter {
  const path = join(sessionDir, "events.jsonl");
  let seq = 0;

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
