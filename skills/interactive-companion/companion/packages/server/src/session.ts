import { mkdirSync, writeFileSync, existsSync, unlinkSync, closeSync, openSync, rmSync } from "fs";
import { join } from "path";

export interface ServerInfo {
  url: string;
  port: number;
  pid: number;
  session_dir: string;
}

export function ensureSessionDir(dir: string): void {
  mkdirSync(join(dir, "screens"), { recursive: true });
  mkdirSync(join(dir, "decisions"), { recursive: true });
  const events = join(dir, "events.jsonl");
  if (!existsSync(events)) {
    closeSync(openSync(events, "a"));
  }
}

export function writeServerInfo(dir: string, info: ServerInfo): void {
  writeFileSync(join(dir, "server-info"), JSON.stringify(info, null, 2) + "\n");
  const stopped = join(dir, "server-stopped");
  if (existsSync(stopped)) unlinkSync(stopped);
}

export function clearServerInfo(dir: string, reason = "stopped"): void {
  const info = join(dir, "server-info");
  if (existsSync(info)) unlinkSync(info);
  writeFileSync(join(dir, "server-stopped"), JSON.stringify({ reason, ts: Date.now() }) + "\n");
}

/**
 * Wipe user-authored content (screens/, decisions/, events.jsonl and any
 * rotated event logs) while preserving any other files the user may have
 * dropped into the session directory. Meant for dev iteration — run before
 * ensureSessionDir so the next start comes up clean.
 */
export function resetSessionDir(dir: string): void {
  for (const sub of ["screens", "decisions"]) {
    const p = join(dir, sub);
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }
  const events = join(dir, "events.jsonl");
  if (existsSync(events)) rmSync(events, { force: true });
  // Remove rotated event files too; they share the events- prefix.
  try {
    const { readdirSync } = require("fs") as typeof import("fs");
    for (const name of readdirSync(dir)) {
      if (name.startsWith("events-") && name.endsWith(".jsonl")) {
        rmSync(join(dir, name), { force: true });
      }
    }
  } catch { /* dir does not exist yet */ }
}
