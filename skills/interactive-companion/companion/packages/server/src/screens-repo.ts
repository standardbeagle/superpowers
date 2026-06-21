import { readFileSync, readdirSync } from "fs";
import { join, basename } from "path";
import matter from "gray-matter";
import chokidar from "chokidar";
import { ScreenFrontmatter, type Screen } from "@companion/shared";

export interface ScreensRepo {
  list(): Screen[];
  get(id: string): Screen | undefined;
  onChange(cb: (kind: "add" | "change" | "remove", id: string) => void): void;
  close(): Promise<void>;
}

export async function createScreensRepo(sessionDir: string): Promise<ScreensRepo> {
  const screensDir = join(sessionDir, "screens");
  const byId = new Map<string, Screen>();
  const listeners: Array<(kind: "add" | "change" | "remove", id: string) => void> = [];

  function loadFile(path: string): Screen | undefined {
    try {
      const raw = readFileSync(path, "utf8");
      const parsed = matter(raw);
      const frontmatter = ScreenFrontmatter.parse(parsed.data);
      return { frontmatter, body: parsed.content, path };
    } catch (err) {
      console.error(`screen parse error ${path}:`, (err as Error).message);
      return undefined;
    }
  }

  // Initial scan
  for (const name of readdirSync(screensDir)) {
    if (!name.endsWith(".md")) continue;
    const s = loadFile(join(screensDir, name));
    if (s) byId.set(s.frontmatter.id, s);
  }

  const watcher = chokidar.watch(join(screensDir, "*.md"), {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 50 },
    usePolling: true,
    interval: 50,
  });
  watcher.on("add", (p) => {
    const s = loadFile(p);
    if (s) { byId.set(s.frontmatter.id, s); listeners.forEach(l => l("add", s.frontmatter.id)); }
  });
  watcher.on("change", (p) => {
    const s = loadFile(p);
    if (s) { byId.set(s.frontmatter.id, s); listeners.forEach(l => l("change", s.frontmatter.id)); }
  });
  watcher.on("unlink", (p) => {
    for (const [k, v] of byId) {
      if (v.path === p) { byId.delete(k); listeners.forEach(l => l("remove", k)); return; }
    }
    listeners.forEach(l => l("remove", basename(p, ".md")));
  });

  // Wait for watcher to be ready before returning, so callers can immediately
  // write files and expect events to fire
  await new Promise<void>((resolve) => watcher.once("ready", resolve));

  return {
    list: () => Array.from(byId.values()),
    get: (id) => byId.get(id),
    onChange: (cb) => { listeners.push(cb); },
    close: async () => { await watcher.close(); },
  };
}
