#!/usr/bin/env bun
import { parseArgs } from "util";
import { resolve } from "path";

interface Options {
  command: "start" | "stop";
  sessionDir: string;
  docRoots: string[];
  host: string;
  port: number | undefined;
  urlHost: string | undefined;
  foreground: boolean;
  emitNavigate: boolean;
  reset: boolean;
}

export function parseCliArgs(argv: string[]): Options {
  const [command, ...rest] = argv;
  if (command !== "start" && command !== "stop") {
    throw new Error(`unknown command: ${command ?? "<missing>"} (expected 'start' or 'stop')`);
  }
  const { values } = parseArgs({
    args: rest,
    options: {
      "session-dir": { type: "string" },
      "doc-root": { type: "string", multiple: true },
      "host": { type: "string", default: "127.0.0.1" },
      "port": { type: "string" },
      "url-host": { type: "string" },
      "foreground": { type: "boolean", default: false },
      "emit-navigate": { type: "boolean", default: false },
      "reset": { type: "boolean", default: false },
    },
    strict: true,
  });
  if (!values["session-dir"]) {
    throw new Error("--session-dir is required");
  }
  return {
    command,
    sessionDir: resolve(values["session-dir"]),
    docRoots: (values["doc-root"] ?? []).map(r => resolve(r)),
    host: values.host ?? "127.0.0.1",
    port: values.port ? Number(values.port) : undefined,
    urlHost: values["url-host"],
    foreground: values.foreground ?? false,
    emitNavigate: values["emit-navigate"] ?? false,
    reset: values.reset ?? false,
  };
}

if (import.meta.main) {
  try {
    const opts = parseCliArgs(process.argv.slice(2));
    const { runStart, runStop } = await import("./server");
    if (opts.command === "start") {
      await runStart(opts);
    } else {
      await runStop(opts);
    }
  } catch (err) {
    console.error((err as Error).message);
    process.exit(2);
  }
}
