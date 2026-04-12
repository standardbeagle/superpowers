import { mkdirSync, writeFileSync, existsSync, unlinkSync, closeSync, openSync } from "fs";
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
