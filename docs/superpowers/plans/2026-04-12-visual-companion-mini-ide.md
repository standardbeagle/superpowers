# Visual Companion Mini-IDE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build v1 of the visual-companion mini-IDE: a Bun-powered TypeScript monorepo at `skills/brainstorming/companion/` that Claude writes markdown+YAML screens into and the user interacts with through a Preact webapp, with all user activity streamed back to Claude via the Claude Code `Monitor` tool tailing `events.jsonl`.

**Architecture:** Bun CLI + HTTP + SSE server, Preact + Vite frontend (built `web/dist/` committed to the fork), shared zod schemas in `shared/`, three screen kinds (`question`, `demo`, `decision`), two write paths to `events.jsonl` (public answers and private-save with contents never echoed).

**Tech Stack:** Bun runtime, TypeScript, zod, chokidar, Preact, preact-iso, Vite, markdown-it (with mermaid plugin), CodeMirror 6, gray-matter for frontmatter parsing.

**Spec:** `docs/superpowers/specs/2026-04-12-visual-companion-mini-ide-design.md`

**Prerequisites (one-time, not a task):** Bun ≥ 1.2 installed on the dev machine (`bun --version`). If missing: `curl -fsSL https://bun.sh/install | bash`. Everything else comes in via `bun install`.

---

## File Map

### Create

**Workspace root**
- `skills/brainstorming/companion/package.json` — Bun workspace root
- `skills/brainstorming/companion/tsconfig.base.json` — shared TS config
- `skills/brainstorming/companion/.gitignore` — node_modules, temp session dirs
- `skills/brainstorming/companion/README.md` — dev/usage notes

**Shared package**
- `skills/brainstorming/companion/shared/package.json`
- `skills/brainstorming/companion/shared/tsconfig.json`
- `skills/brainstorming/companion/shared/src/index.ts`
- `skills/brainstorming/companion/shared/src/screen.ts` — `Screen`, `InputDef`, `ScreenKind`, zod schemas
- `skills/brainstorming/companion/shared/src/event.ts` — `Event` union, seq-bearing envelope
- `skills/brainstorming/companion/shared/src/decision.ts` — `Decision`, `DecisionStatus`
- `skills/brainstorming/companion/shared/test/screen.test.ts`

**Server package**
- `skills/brainstorming/companion/packages/server/package.json`
- `skills/brainstorming/companion/packages/server/tsconfig.json`
- `skills/brainstorming/companion/packages/server/src/cli.ts`
- `skills/brainstorming/companion/packages/server/src/server.ts`
- `skills/brainstorming/companion/packages/server/src/session.ts` — session dir scaffolding
- `skills/brainstorming/companion/packages/server/src/screens-repo.ts` — watch + load + cache
- `skills/brainstorming/companion/packages/server/src/events-writer.ts` — seq + jsonl + rotation
- `skills/brainstorming/companion/packages/server/src/decisions-repo.ts`
- `skills/brainstorming/companion/packages/server/src/privacy.ts`
- `skills/brainstorming/companion/packages/server/src/routes.ts`
- `skills/brainstorming/companion/packages/server/src/sse.ts`
- `skills/brainstorming/companion/packages/server/src/idempotency.ts`
- `skills/brainstorming/companion/packages/server/test/screens-repo.test.ts`
- `skills/brainstorming/companion/packages/server/test/events-writer.test.ts`
- `skills/brainstorming/companion/packages/server/test/privacy.test.ts`
- `skills/brainstorming/companion/packages/server/test/decisions-repo.test.ts`
- `skills/brainstorming/companion/packages/server/test/routes.integration.test.ts`

**Web package**
- `skills/brainstorming/companion/packages/web/package.json`
- `skills/brainstorming/companion/packages/web/tsconfig.json`
- `skills/brainstorming/companion/packages/web/vite.config.ts`
- `skills/brainstorming/companion/packages/web/index.html`
- `skills/brainstorming/companion/packages/web/src/main.tsx`
- `skills/brainstorming/companion/packages/web/src/app.tsx`
- `skills/brainstorming/companion/packages/web/src/layout/Shell.tsx`
- `skills/brainstorming/companion/packages/web/src/layout/Sidebar.tsx`
- `skills/brainstorming/companion/packages/web/src/layout/Activity.tsx`
- `skills/brainstorming/companion/packages/web/src/lib/api.ts`
- `skills/brainstorming/companion/packages/web/src/lib/sse.ts`
- `skills/brainstorming/companion/packages/web/src/lib/markdown.ts`
- `skills/brainstorming/companion/packages/web/src/lib/mermaid.ts`
- `skills/brainstorming/companion/packages/web/src/lib/codemirror.ts`
- `skills/brainstorming/companion/packages/web/src/screens/ScreenView.tsx`
- `skills/brainstorming/companion/packages/web/src/screens/DemoView.tsx`
- `skills/brainstorming/companion/packages/web/src/screens/DecisionView.tsx`
- `skills/brainstorming/companion/packages/web/src/screens/DocsView.tsx`
- `skills/brainstorming/companion/packages/web/src/screens/FilesView.tsx`
- `skills/brainstorming/companion/packages/web/src/inputs/RadioInput.tsx`
- `skills/brainstorming/companion/packages/web/src/inputs/MultiInput.tsx`
- `skills/brainstorming/companion/packages/web/src/inputs/TextInput.tsx`
- `skills/brainstorming/companion/packages/web/src/inputs/CodeInput.tsx`
- `skills/brainstorming/companion/packages/web/src/inputs/FileEditInput.tsx`
- `skills/brainstorming/companion/packages/web/src/styles.css`

**Skill integration**
- `skills/brainstorming/companion/docs/screen-format.md` — reference for Claude
- `skills/brainstorming/SKILL.md` — **Modify** the Visual Companion section to point at `companion/` and the Monitor incantation
- `skills/brainstorming/visual-companion.md` — **Modify** to describe the new format, deprecate the fragment path

### Keep (for now, removed in the last chunk)
- `skills/brainstorming/scripts/` — old fragment-based companion stays live until Chunk 14 flips the skill to the new path. Do NOT touch during Chunks 1–13.

### Delete (final chunk only)
- `skills/brainstorming/scripts/*` — after the new companion is wired into the skill and integration tests pass

---

## Working Conventions

- **Branch:** Create a single feature branch `feat/visual-companion-mini-ide` at the start of Task 1. All commits land here.
- **Commits:** One commit per task, following conventional commits (`feat(companion): ...`, `test(companion): ...`, `chore(companion): ...`). Commit messages always include the co-author line shown in each task.
- **TDD:** Every code task follows red-green-commit. Red step is not optional — always run the test first and paste the failing output into your response.
- **Bun:** Test runner is `bun test`. Do not introduce Jest, Vitest, or node:test.
- **No secrets in tests:** The privacy property test uses `TOTALLY_FAKE_SECRET_FOR_TESTING` strings. Never a real secret.
- **Commit co-author footer:**
  ```
  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  ```

---

## Chunk 0: Branch setup

### Task 0: Create the feature branch

**Files:** none (git state only)

- [ ] **Step 1: Verify clean working tree**

Run: `git status --short`
Expected: no output (clean).

- [ ] **Step 2: Create and switch to branch**

Run: `git checkout -b feat/visual-companion-mini-ide`
Expected: `Switched to a new branch 'feat/visual-companion-mini-ide'`

---

## Chunk 1: Monorepo Scaffold & Shared Types

### Task 1: Workspace root, tsconfig, .gitignore

**Files:**
- Create: `skills/brainstorming/companion/package.json`
- Create: `skills/brainstorming/companion/tsconfig.base.json`
- Create: `skills/brainstorming/companion/.gitignore`
- Create: `skills/brainstorming/companion/README.md`

- [ ] **Step 1: Create the workspace package.json**

```json
{
  "name": "@companion/root",
  "private": true,
  "workspaces": [
    "shared",
    "packages/server",
    "packages/web"
  ],
  "scripts": {
    "build": "bun run --cwd packages/web build",
    "test": "bun test",
    "dev": "bun run --cwd packages/server dev"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create shared tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "types": ["bun-types"]
  }
}
```

- [ ] **Step 3: Create .gitignore**

```gitignore
node_modules
.DS_Store
*.log
.bun
tmp-sessions/
```

- [ ] **Step 4: Create placeholder README.md**

```markdown
# Visual Companion

Mini-IDE for brainstorming. See `../../../docs/superpowers/specs/2026-04-12-visual-companion-mini-ide-design.md`.

## Quickstart

```bash
bun install
bun run build
bun run --cwd packages/server dev --session-dir /tmp/my-session
```
```

- [ ] **Step 5: Commit**

```bash
git add skills/brainstorming/companion/package.json skills/brainstorming/companion/tsconfig.base.json skills/brainstorming/companion/.gitignore skills/brainstorming/companion/README.md
git commit -m "$(cat <<'EOF'
chore(companion): scaffold workspace root

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2: Shared package — zod schemas

**Files:**
- Create: `skills/brainstorming/companion/shared/package.json`
- Create: `skills/brainstorming/companion/shared/tsconfig.json`
- Create: `skills/brainstorming/companion/shared/src/index.ts`
- Create: `skills/brainstorming/companion/shared/src/screen.ts`
- Create: `skills/brainstorming/companion/shared/src/event.ts`
- Create: `skills/brainstorming/companion/shared/src/decision.ts`

- [ ] **Step 1: Create shared/package.json**

```json
{
  "name": "@companion/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "zod": "^3.23.0"
  }
}
```

- [ ] **Step 2: Create shared/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Install workspace deps**

Run: `cd skills/brainstorming/companion && bun install`
Expected: `Done! ... packages installed`. `bun.lockb` created.

- [ ] **Step 4: Write `shared/src/screen.ts`**

```typescript
import { z } from "zod";

export const InputDef = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("radio"),
    name: z.string().min(1),
    label: z.string().optional(),
    options: z.array(z.union([z.string(), z.object({ value: z.string(), label: z.string() })])).min(2),
    private: z.literal(false).optional(),
  }),
  z.object({
    type: z.literal("multi"),
    name: z.string().min(1),
    label: z.string().optional(),
    options: z.array(z.union([z.string(), z.object({ value: z.string(), label: z.string() })])).min(2),
    private: z.literal(false).optional(),
  }),
  z.object({
    type: z.literal("text"),
    name: z.string().min(1),
    label: z.string().optional(),
    multiline: z.boolean().default(false),
    placeholder: z.string().optional(),
    private: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("code"),
    name: z.string().min(1),
    label: z.string().optional(),
    language: z.string().default("text"),
    placeholder: z.string().optional(),
    private: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("file-edit"),
    name: z.string().min(1).optional(),
    path: z.string().min(1),
    language: z.string().optional(),
    private: z.literal(true),
  }),
]);
export type InputDef = z.infer<typeof InputDef>;

const QuestionScreen = z.object({
  kind: z.literal("question"),
  id: z.string().min(1),
  title: z.string().min(1),
  pinned: z.boolean().default(false),
  inputs: z.array(InputDef).min(1),
});

const DemoScreen = z.object({
  kind: z.literal("demo"),
  id: z.string().min(1),
  title: z.string().min(1),
  pinned: z.boolean().default(false),
  demo: z.object({
    type: z.literal("srcdoc"),
    html: z.string().optional(),
    css: z.string().optional(),
    js: z.string().optional(),
    inlineHtml: z.string().optional(),
    viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).default({ width: 480, height: 720 }),
  }).refine(d => d.html || d.inlineHtml, { message: "demo requires html path or inlineHtml" }),
  actions: z.array(z.object({
    type: z.enum(["approve", "revise", "reject"]),
    label: z.string().min(1),
    requires_note: z.boolean().default(false),
  })).min(1),
});

const DecisionOption = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  recommended: z.boolean().default(false),
});

const DecisionScreen = z.object({
  kind: z.literal("decision"),
  id: z.string().min(1),
  title: z.string().min(1),
  pinned: z.boolean().default(false),
  status: z.enum(["proposed", "approved", "revised", "rejected"]).default("proposed"),
  options: z.array(DecisionOption).min(2),
});

export const ScreenFrontmatter = z.discriminatedUnion("kind", [QuestionScreen, DemoScreen, DecisionScreen]);
export type ScreenFrontmatter = z.infer<typeof ScreenFrontmatter>;

export interface Screen {
  frontmatter: ScreenFrontmatter;
  body: string;
  path: string;
}
```

- [ ] **Step 5: Write `shared/src/event.ts`**

```typescript
import { z } from "zod";

const Base = z.object({
  ts: z.number().int(),
  seq: z.number().int().nonnegative(),
  screen_id: z.string().optional(),
});

export const Event = z.discriminatedUnion("type", [
  Base.extend({ type: z.literal("answer"), inputs: z.record(z.any()) }),
  Base.extend({ type: z.literal("saved"), name: z.string(), path: z.string(), bytes: z.number().int(), sha256: z.string() }),
  Base.extend({ type: z.literal("demo_event"), name: z.string(), data: z.any().optional() }),
  Base.extend({ type: z.literal("demo_event_throttled"), dropped: z.number().int().nonnegative() }),
  Base.extend({ type: z.literal("decision"), id: z.string(), status: z.enum(["proposed","approved","revised","rejected"]), chosen_option: z.string().optional(), note: z.string().optional() }),
  Base.extend({ type: z.literal("navigate"), to: z.string(), from: z.string().optional() }),
  Base.extend({ type: z.literal("screen_error"), path: z.string(), message: z.string() }),
  Base.extend({ type: z.literal("save_error"), name: z.string(), path: z.string(), errno: z.string() }),
  Base.extend({ type: z.literal("server_ready"), url: z.string(), port: z.number().int(), pid: z.number().int() }),
  Base.extend({ type: z.literal("server_stopped"), reason: z.string() }),
]);
export type Event = z.infer<typeof Event>;
```

- [ ] **Step 6: Write `shared/src/decision.ts`**

```typescript
import { z } from "zod";

export const DecisionStatus = z.enum(["proposed", "approved", "revised", "rejected"]);
export type DecisionStatus = z.infer<typeof DecisionStatus>;

export const Decision = z.object({
  id: z.string(),
  title: z.string(),
  status: DecisionStatus,
  chosen_option: z.string().optional(),
  note: z.string().optional(),
  path: z.string(),
});
export type Decision = z.infer<typeof Decision>;
```

- [ ] **Step 7: Write `shared/src/index.ts`**

```typescript
export * from "./screen";
export * from "./event";
export * from "./decision";
```

- [ ] **Step 8: Typecheck**

Run: `cd skills/brainstorming/companion && bun x tsc -p shared --noEmit`
Expected: no output (success).

- [ ] **Step 9: Commit**

```bash
git add skills/brainstorming/companion/shared skills/brainstorming/companion/bun.lockb
git commit -m "$(cat <<'EOF'
feat(companion): shared zod schemas for screens, events, decisions

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 3: Test the screen schemas

**Files:**
- Create: `skills/brainstorming/companion/shared/test/screen.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `cd skills/brainstorming/companion && bun test shared/test/screen.test.ts`
Expected: `5 pass` (all green). If any fail, the schema in Task 2 has a bug — fix it there, then re-run.

- [ ] **Step 3: Commit**

```bash
git add skills/brainstorming/companion/shared/test
git commit -m "$(cat <<'EOF'
test(companion): screen schema parsing + privacy invariants

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 2: Server Foundation

### Task 4: Server package skeleton + CLI args

**Files:**
- Create: `skills/brainstorming/companion/packages/server/package.json`
- Create: `skills/brainstorming/companion/packages/server/tsconfig.json`
- Create: `skills/brainstorming/companion/packages/server/src/cli.ts`

- [ ] **Step 1: Create server package.json**

```json
{
  "name": "@companion/server",
  "version": "0.0.0",
  "type": "module",
  "bin": { "companion": "src/cli.ts" },
  "scripts": {
    "dev": "bun run src/cli.ts start",
    "test": "bun test"
  },
  "dependencies": {
    "@companion/shared": "workspace:*",
    "chokidar": "^3.6.0",
    "gray-matter": "^4.0.3",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

- [ ] **Step 2: Create server tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*", "test/**/*"],
  "compilerOptions": {
    "paths": { "@companion/shared": ["../../shared/src"] }
  }
}
```

- [ ] **Step 3: Install**

Run: `cd skills/brainstorming/companion && bun install`
Expected: chokidar, gray-matter, zod resolved. No errors.

- [ ] **Step 4: Write `src/cli.ts`**

```typescript
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
```

- [ ] **Step 5: Write a smoke test for `parseCliArgs`**

Create `packages/server/test/cli.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { parseCliArgs } from "../src/cli";

test("parses start with session-dir", () => {
  const opts = parseCliArgs(["start", "--session-dir", "/tmp/s1"]);
  expect(opts.command).toBe("start");
  expect(opts.sessionDir).toBe("/tmp/s1");
});

test("errors when session-dir missing", () => {
  expect(() => parseCliArgs(["start"])).toThrow(/session-dir/);
});

test("collects multiple doc-roots", () => {
  const opts = parseCliArgs(["start", "--session-dir", "/tmp/s1", "--doc-root", "./a", "--doc-root", "./b"]);
  expect(opts.docRoots).toHaveLength(2);
});
```

- [ ] **Step 6: Run it and fix until green**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/cli.test.ts`
Expected: `3 pass`. Note: the test will fail to import `./server` — that's fine, the dynamic import is only triggered from `import.meta.main`. If the test harness resolves it eagerly anyway, create a minimal `packages/server/src/server.ts` stub with `export async function runStart() {} export async function runStop() {}` and commit in the next task's Step 1.

- [ ] **Step 7: Commit**

```bash
git add skills/brainstorming/companion/packages/server skills/brainstorming/companion/bun.lockb
git commit -m "$(cat <<'EOF'
feat(companion): server package + CLI arg parser

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 5: Session scaffolding and `server-info` handshake

**Files:**
- Create: `skills/brainstorming/companion/packages/server/src/session.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/server/test/session.test.ts`:

```typescript
import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ensureSessionDir, writeServerInfo, clearServerInfo } from "../src/session";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "comp-"));
});

test("ensureSessionDir creates required subdirs and events.jsonl", () => {
  ensureSessionDir(dir);
  expect(existsSync(join(dir, "screens"))).toBe(true);
  expect(existsSync(join(dir, "decisions"))).toBe(true);
  expect(existsSync(join(dir, "events.jsonl"))).toBe(true);
});

test("writeServerInfo writes JSON and clearServerInfo removes it", () => {
  ensureSessionDir(dir);
  writeServerInfo(dir, { url: "http://x", port: 1, pid: 2, session_dir: dir });
  expect(JSON.parse(readFileSync(join(dir, "server-info"), "utf8")).port).toBe(1);
  clearServerInfo(dir);
  expect(existsSync(join(dir, "server-info"))).toBe(false);
  expect(existsSync(join(dir, "server-stopped"))).toBe(true);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/session.test.ts`
Expected: FAIL, `session.ts` not found.

- [ ] **Step 3: Implement `session.ts`**

```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/session.test.ts`
Expected: `2 pass`.

- [ ] **Step 5: Commit**

```bash
git add skills/brainstorming/companion/packages/server/src/session.ts skills/brainstorming/companion/packages/server/test/session.test.ts
git commit -m "$(cat <<'EOF'
feat(companion): session directory scaffolding and server-info

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 6: Bun HTTP server with health route and graceful shutdown

**Files:**
- Create: `skills/brainstorming/companion/packages/server/src/server.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/server/test/server.health.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("health route returns ok", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({
    command: "start", sessionDir: dir, docRoots: [],
    host: "127.0.0.1", port: 0, urlHost: undefined,
    foreground: true, emitNavigate: false,
  });
  try {
    const res = await fetch(`${ctl.url}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  } finally {
    await stopRunning(ctl);
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/server.health.test.ts`
Expected: FAIL with `server.ts` import error.

- [ ] **Step 3: Implement `server.ts`**

```typescript
import { ensureSessionDir, writeServerInfo, clearServerInfo } from "./session";
import type { Server } from "bun";

export interface CliOptions {
  command: "start" | "stop";
  sessionDir: string;
  docRoots: string[];
  host: string;
  port: number | undefined;
  urlHost: string | undefined;
  foreground: boolean;
  emitNavigate: boolean;
}

export interface RunningServer {
  url: string;
  port: number;
  server: Server;
  sessionDir: string;
  shutdown: () => Promise<void>;
}

export async function runStart(opts: CliOptions): Promise<RunningServer> {
  ensureSessionDir(opts.sessionDir);

  const server = Bun.serve({
    hostname: opts.host,
    port: opts.port ?? 0,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/api/health") {
        return Response.json({ ok: true });
      }
      return new Response("not found", { status: 404 });
    },
  });

  const urlHost = opts.urlHost ?? opts.host;
  const url = `http://${urlHost}:${server.port}`;
  const info = { url, port: server.port, pid: process.pid, session_dir: opts.sessionDir };
  writeServerInfo(opts.sessionDir, info);
  process.stdout.write(JSON.stringify({ type: "server_ready", ...info }) + "\n");

  const shutdown = async () => {
    clearServerInfo(opts.sessionDir, "stopped");
    server.stop(true);
  };

  process.on("SIGTERM", () => { void shutdown().then(() => process.exit(0)); });
  process.on("SIGINT",  () => { void shutdown().then(() => process.exit(0)); });

  return { url, port: server.port, server, sessionDir: opts.sessionDir, shutdown };
}

export async function stopRunning(ctl: RunningServer): Promise<void> {
  await ctl.shutdown();
}

export async function runStop(opts: CliOptions): Promise<void> {
  const { readFileSync, existsSync } = await import("fs");
  const { join } = await import("path");
  const info = join(opts.sessionDir, "server-info");
  if (!existsSync(info)) {
    console.error("no running server at", opts.sessionDir);
    return;
  }
  const { pid } = JSON.parse(readFileSync(info, "utf8"));
  process.kill(pid, "SIGTERM");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/server.health.test.ts`
Expected: `1 pass`.

- [ ] **Step 5: Commit**

```bash
git add skills/brainstorming/companion/packages/server/src/server.ts skills/brainstorming/companion/packages/server/test/server.health.test.ts
git commit -m "$(cat <<'EOF'
feat(companion): Bun HTTP server with health route

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 7: Screens repo with chokidar watcher

**Files:**
- Create: `skills/brainstorming/companion/packages/server/src/screens-repo.ts`
- Create: `skills/brainstorming/companion/packages/server/test/screens-repo.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createScreensRepo } from "../src/screens-repo";
import { ensureSessionDir } from "../src/session";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "comp-")); ensureSessionDir(dir); });

test("list returns parsed screens", async () => {
  writeFileSync(join(dir, "screens", "deploy.md"),
    `---\nkind: question\nid: deploy\ntitle: Deploy?\ninputs:\n  - {type: radio, name: t, options: [a, b]}\n---\n\nBody`);
  const repo = await createScreensRepo(dir);
  try {
    const list = repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].frontmatter.id).toBe("deploy");
    expect(list[0].body.trim()).toBe("Body");
  } finally { await repo.close(); }
});

test("get returns the named screen", async () => {
  writeFileSync(join(dir, "screens", "deploy.md"),
    `---\nkind: question\nid: deploy\ntitle: Deploy?\ninputs:\n  - {type: radio, name: t, options: [a, b]}\n---\n`);
  const repo = await createScreensRepo(dir);
  try {
    const s = repo.get("deploy");
    expect(s?.frontmatter.title).toBe("Deploy?");
  } finally { await repo.close(); }
});

test("fires change events when a screen is added", async () => {
  const repo = await createScreensRepo(dir);
  const events: string[] = [];
  repo.onChange((kind, id) => events.push(`${kind}:${id}`));
  try {
    writeFileSync(join(dir, "screens", "new.md"),
      `---\nkind: question\nid: new\ntitle: New?\ninputs:\n  - {type: text, name: n}\n---\n`);
    await new Promise(r => setTimeout(r, 300));
    expect(events).toContain("add:new");
  } finally { await repo.close(); }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/screens-repo.test.ts`
Expected: FAIL, `screens-repo.ts` not found.

- [ ] **Step 3: Implement `screens-repo.ts`**

```typescript
import { readFileSync, readdirSync } from "fs";
import { join, basename } from "path";
import matter from "gray-matter";
import chokidar from "chokidar";
import { ScreenFrontmatter, type Screen } from "@companion/shared";

export interface ScreensRepo {
  list(): Screen[];
  get(id: string): Screen | undefined;
  onChange(cb: (kind: "add"|"change"|"remove", id: string) => void): void;
  close(): Promise<void>;
}

export async function createScreensRepo(sessionDir: string): Promise<ScreensRepo> {
  const screensDir = join(sessionDir, "screens");
  const byId = new Map<string, Screen>();
  const listeners: Array<(kind: "add"|"change"|"remove", id: string) => void> = [];

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

  const watcher = chokidar.watch(join(screensDir, "*.md"), { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 50 } });
  watcher.on("add",    (p) => { const s = loadFile(p); if (s) { byId.set(s.frontmatter.id, s); listeners.forEach(l => l("add", s.frontmatter.id)); } });
  watcher.on("change", (p) => { const s = loadFile(p); if (s) { byId.set(s.frontmatter.id, s); listeners.forEach(l => l("change", s.frontmatter.id)); } });
  watcher.on("unlink", (p) => {
    const id = basename(p, ".md");
    for (const [k, v] of byId) if (v.path === p) { byId.delete(k); listeners.forEach(l => l("remove", k)); return; }
    listeners.forEach(l => l("remove", id));
  });

  return {
    list: () => Array.from(byId.values()),
    get: (id) => byId.get(id),
    onChange: (cb) => { listeners.push(cb); },
    close: async () => { await watcher.close(); },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/screens-repo.test.ts`
Expected: `3 pass`. If the add-event test is flaky, bump the `setTimeout` to 500ms and leave a comment: `// chokidar flush delay varies by filesystem`.

- [ ] **Step 5: Commit**

```bash
git add skills/brainstorming/companion/packages/server/src/screens-repo.ts skills/brainstorming/companion/packages/server/test/screens-repo.test.ts
git commit -m "$(cat <<'EOF'
feat(companion): screens repo with chokidar live reload

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 3: Screens and SSE

### Task 8: GET /api/screens and /api/screens/:id

**Files:**
- Create: `skills/brainstorming/companion/packages/server/src/routes.ts`
- Modify: `skills/brainstorming/companion/packages/server/src/server.ts` (wire routes)

- [ ] **Step 1: Write the failing test**

Create `packages/server/test/routes.screens.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

async function withServer(fn: (url: string, dir: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  writeFileSync(join(dir, "screens" /* dir not made yet */), "", { flag: "a" }).catch?.(() => {}); // noop
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try { await fn(ctl.url, dir); } finally { await stopRunning(ctl); rmSync(dir, { recursive: true, force: true }); }
}

test("GET /api/screens lists parsed screens", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: One\ninputs:\n  - {type: text, name: n}\n---\nHello`);
    const list = await (await fetch(`${url}/api/screens`)).json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("s1");
    expect(list[0].kind).toBe("question");
    expect(list[0].title).toBe("One");
  });
});

test("GET /api/screens/:id returns body + frontmatter", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: One\ninputs:\n  - {type: text, name: n}\n---\n# Hello`);
    const s = await (await fetch(`${url}/api/screens/s1`)).json();
    expect(s.frontmatter.id).toBe("s1");
    expect(s.body).toContain("# Hello");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/routes.screens.test.ts`
Expected: FAIL, 404 from unrouted paths.

- [ ] **Step 3: Create `routes.ts`**

```typescript
import type { ScreensRepo } from "./screens-repo";

export interface RouteCtx {
  screens: ScreensRepo;
}

export function handle(req: Request, ctx: RouteCtx): Response | Promise<Response> {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname === "/api/health") {
    return Response.json({ ok: true });
  }
  if (req.method === "GET" && url.pathname === "/api/screens") {
    return Response.json(ctx.screens.list().map(s => ({
      id: s.frontmatter.id,
      kind: s.frontmatter.kind,
      title: s.frontmatter.title,
      pinned: s.frontmatter.pinned,
    })));
  }
  if (req.method === "GET" && url.pathname.startsWith("/api/screens/")) {
    const id = url.pathname.slice("/api/screens/".length);
    const s = ctx.screens.get(id);
    if (!s) return new Response("not found", { status: 404 });
    return Response.json({ frontmatter: s.frontmatter, body: s.body });
  }
  return new Response("not found", { status: 404 });
}
```

- [ ] **Step 4: Wire the repo and routes into `server.ts`**

Replace the existing `fetch` handler in `runStart` with:

```typescript
import { createScreensRepo, type ScreensRepo } from "./screens-repo";
import { handle } from "./routes";

// inside runStart, before Bun.serve:
const screens = await createScreensRepo(opts.sessionDir);
const ctx = { screens };

// replace fetch(req) with:
  fetch(req) { return handle(req, ctx); },
```

Add `await screens.close();` to the `shutdown` function before `server.stop(true)`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/routes.screens.test.ts`
Expected: `2 pass`. Also run: `bun test` and confirm nothing earlier regressed.

- [ ] **Step 6: Commit**

```bash
git add skills/brainstorming/companion/packages/server/src/routes.ts skills/brainstorming/companion/packages/server/src/server.ts skills/brainstorming/companion/packages/server/test/routes.screens.test.ts
git commit -m "$(cat <<'EOF'
feat(companion): GET /api/screens routes

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 9: SSE stream for live refresh

**Files:**
- Create: `skills/brainstorming/companion/packages/server/src/sse.ts`
- Modify: `routes.ts` (add `/api/stream` route)
- Modify: `server.ts` (wire SSE hub to repo `onChange`)

- [ ] **Step 1: Write the failing test**

Create `packages/server/test/sse.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("SSE pushes refresh event when a screen is added", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try {
    const res = await fetch(`${ctl.url}/api/stream`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    // Give the server a tick to register the client before writing the file
    await new Promise(r => setTimeout(r, 50));
    writeFileSync(join(dir, "screens", "x.md"),
      `---\nkind: question\nid: x\ntitle: X\ninputs:\n  - {type: text, name: n}\n---\n`);

    // Read one SSE event with a 2s timeout
    const read = reader.read();
    const timed = new Promise<{value?:Uint8Array}>((_, reject) => setTimeout(() => reject(new Error("sse timeout")), 2000));
    const { value } = await Promise.race([read, timed]) as { value?: Uint8Array };
    const text = decoder.decode(value!);
    expect(text).toContain("event: refresh");
    expect(text).toContain("\"kind\":\"screen\"");
    expect(text).toContain("\"id\":\"x\"");
    reader.cancel();
  } finally {
    await stopRunning(ctl);
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/sse.test.ts`
Expected: FAIL (404 on `/api/stream`).

- [ ] **Step 3: Implement `sse.ts`**

```typescript
export interface SseHub {
  handle(req: Request): Response;
  push(event: string, data: unknown): void;
  close(): void;
}

export function createSseHub(): SseHub {
  const encoder = new TextEncoder();
  const clients = new Set<WritableStreamDefaultWriter<Uint8Array>>();

  return {
    handle(): Response {
      const ts = new TransformStream<Uint8Array, Uint8Array>();
      const writer = ts.writable.getWriter();
      clients.add(writer);
      writer.write(encoder.encode(": connected\n\n")).catch(() => {});
      const abort = () => { clients.delete(writer); writer.close().catch(() => {}); };
      // release on client disconnect
      writer.closed.then(abort, abort);
      return new Response(ts.readable, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          "connection": "keep-alive",
        },
      });
    },
    push(event, data) {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      const bytes = encoder.encode(payload);
      for (const w of clients) w.write(bytes).catch(() => clients.delete(w));
    },
    close() {
      for (const w of clients) w.close().catch(() => {});
      clients.clear();
    },
  };
}
```

- [ ] **Step 4: Wire into `routes.ts` and `server.ts`**

In `routes.ts`, extend `RouteCtx`:

```typescript
import type { SseHub } from "./sse";
export interface RouteCtx { screens: ScreensRepo; sse: SseHub; }
```

Add the route branch before the final `return`:

```typescript
  if (req.method === "GET" && url.pathname === "/api/stream") {
    return ctx.sse.handle(req);
  }
```

In `server.ts` inside `runStart`:

```typescript
import { createSseHub } from "./sse";
// ...
const sse = createSseHub();
const ctx = { screens, sse };
screens.onChange((kind, id) => {
  sse.push("refresh", { kind: "screen", id, action: kind });
});
// in shutdown:
sse.close();
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/sse.test.ts`
Expected: `1 pass`. Also run full suite: `bun test` — still all green.

- [ ] **Step 6: Commit**

```bash
git add skills/brainstorming/companion/packages/server/src/sse.ts skills/brainstorming/companion/packages/server/src/routes.ts skills/brainstorming/companion/packages/server/src/server.ts skills/brainstorming/companion/packages/server/test/sse.test.ts
git commit -m "$(cat <<'EOF'
feat(companion): SSE /api/stream with refresh events on screen change

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 4: Answers and Events Writer

### Task 10: Events writer with seq counter and rotation

**Files:**
- Create: `skills/brainstorming/companion/packages/server/src/events-writer.ts`
- Create: `skills/brainstorming/companion/packages/server/test/events-writer.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, readFileSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createEventsWriter } from "../src/events-writer";
import { ensureSessionDir } from "../src/session";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "comp-")); ensureSessionDir(dir); });

test("append assigns seq monotonically", async () => {
  const w = createEventsWriter(dir, { rotateBytes: 1_000_000 });
  await w.append({ type: "answer", inputs: { a: 1 } });
  await w.append({ type: "answer", inputs: { a: 2 } });
  const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n");
  const a = JSON.parse(lines[0]!);
  const b = JSON.parse(lines[1]!);
  expect(a.seq).toBe(0);
  expect(b.seq).toBe(1);
  expect(a.ts).toBeLessThanOrEqual(b.ts);
});

test("rotates when the file grows past rotateBytes", async () => {
  const w = createEventsWriter(dir, { rotateBytes: 100 });
  const big = "x".repeat(80);
  await w.append({ type: "answer", inputs: { s: big } });
  await w.append({ type: "answer", inputs: { s: big } });
  const size = statSync(join(dir, "events.jsonl")).size;
  expect(size).toBeLessThan(300); // a rotation happened at least once
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/events-writer.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `events-writer.ts`**

```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/events-writer.test.ts`
Expected: `2 pass`.

- [ ] **Step 5: Commit**

```bash
git add skills/brainstorming/companion/packages/server/src/events-writer.ts skills/brainstorming/companion/packages/server/test/events-writer.test.ts
git commit -m "$(cat <<'EOF'
feat(companion): events writer with seq and size-based rotation

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 11: POST /api/answer with idempotency and private-input filter

**Files:**
- Create: `skills/brainstorming/companion/packages/server/src/idempotency.ts`
- Modify: `routes.ts`
- Modify: `server.ts` (wire events writer + idempotency)

- [ ] **Step 1: Write the failing test**

Create `packages/server/test/routes.answer.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

async function withServer(fn: (url: string, dir: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try { await fn(ctl.url, dir); } finally { await stopRunning(ctl); rmSync(dir, { recursive: true, force: true }); }
}

test("POST /api/answer appends an answer event excluding private inputs", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: T\ninputs:\n  - {type: radio, name: target, options: [a, b]}\n  - {type: text,  name: notes}\n  - {type: text,  name: secret, private: true}\n---\n`);
    // wait for watcher to pick it up
    await new Promise(r => setTimeout(r, 200));
    const res = await fetch(`${url}/api/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        screen_id: "s1",
        client_submission_id: "cs1",
        inputs: { target: "a", notes: "looks good", secret: "hunter2" },
      }),
    });
    expect(res.status).toBe(200);
    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean);
    const ev = JSON.parse(lines[lines.length - 1]!);
    expect(ev.type).toBe("answer");
    expect(ev.inputs.target).toBe("a");
    expect(ev.inputs.notes).toBe("looks good");
    expect(ev.inputs.secret).toBeUndefined();
  });
});

test("idempotent: repeated submission for the same client_submission_id only appends once", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: T\ninputs:\n  - {type: text, name: notes}\n---\n`);
    await new Promise(r => setTimeout(r, 200));
    const body = JSON.stringify({ screen_id: "s1", client_submission_id: "dup", inputs: { notes: "a" } });
    await fetch(`${url}/api/answer`, { method: "POST", headers: { "content-type": "application/json" }, body });
    await fetch(`${url}/api/answer`, { method: "POST", headers: { "content-type": "application/json" }, body });
    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean);
    const answers = lines.map(l => JSON.parse(l)).filter(e => e.type === "answer");
    expect(answers).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/routes.answer.test.ts`
Expected: FAIL (404 on `/api/answer`).

- [ ] **Step 3: Implement `idempotency.ts`**

```typescript
export interface IdempotencyStore {
  seen(screenId: string, clientId: string): boolean;
  remember(screenId: string, clientId: string): void;
}
export function createIdempotencyStore(maxEntries = 1024): IdempotencyStore {
  const set = new Set<string>();
  const order: string[] = [];
  const key = (s: string, c: string) => `${s}::${c}`;
  return {
    seen: (s, c) => set.has(key(s, c)),
    remember: (s, c) => {
      const k = key(s, c);
      if (set.has(k)) return;
      set.add(k);
      order.push(k);
      if (order.length > maxEntries) {
        const old = order.shift()!;
        set.delete(old);
      }
    },
  };
}
```

- [ ] **Step 4: Extend `routes.ts`**

```typescript
import type { EventsWriter } from "./events-writer";
import type { IdempotencyStore } from "./idempotency";

export interface RouteCtx {
  screens: ScreensRepo;
  sse: SseHub;
  events: EventsWriter;
  idempotency: IdempotencyStore;
}

// Add inside handle(), before the final return:

if (req.method === "POST" && url.pathname === "/api/answer") {
  const body = await req.json().catch(() => null) as {
    screen_id?: string; client_submission_id?: string; inputs?: Record<string, unknown>;
  } | null;
  if (!body?.screen_id || !body.client_submission_id || !body.inputs) {
    return new Response("bad request", { status: 400 });
  }
  const screen = ctx.screens.get(body.screen_id);
  if (!screen || screen.frontmatter.kind !== "question") {
    return new Response("unknown screen", { status: 404 });
  }
  if (ctx.idempotency.seen(body.screen_id, body.client_submission_id)) {
    return Response.json({ ok: true, duplicate: true });
  }
  ctx.idempotency.remember(body.screen_id, body.client_submission_id);

  const publicInputs: Record<string, unknown> = {};
  for (const def of screen.frontmatter.inputs) {
    if ("private" in def && def.private) continue;
    if (def.type === "file-edit") continue;
    const name = def.name;
    if (name in body.inputs) publicInputs[name] = body.inputs[name];
  }
  await ctx.events.append({ type: "answer", screen_id: body.screen_id, inputs: publicInputs });
  return Response.json({ ok: true });
}
```

- [ ] **Step 5: Wire writer + idempotency in `server.ts`**

```typescript
import { createEventsWriter } from "./events-writer";
import { createIdempotencyStore } from "./idempotency";

const events = createEventsWriter(opts.sessionDir, { rotateBytes: 10_000_000 });
const idempotency = createIdempotencyStore();
const ctx = { screens, sse, events, idempotency };
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/routes.answer.test.ts`
Expected: `2 pass`. Full suite still green: `bun test`.

- [ ] **Step 7: Commit**

```bash
git add skills/brainstorming/companion/packages/server/src/idempotency.ts skills/brainstorming/companion/packages/server/src/routes.ts skills/brainstorming/companion/packages/server/src/server.ts skills/brainstorming/companion/packages/server/test/routes.answer.test.ts
git commit -m "$(cat <<'EOF'
feat(companion): POST /api/answer with idempotency and private filter

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 5: Privacy Path

### Task 12: POST /api/private-save

**Files:**
- Create: `skills/brainstorming/companion/packages/server/src/privacy.ts`
- Modify: `routes.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/server/test/privacy.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

async function withServer(fn: (url: string, dir: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try { await fn(ctl.url, dir); } finally { await stopRunning(ctl); rmSync(dir, { recursive: true, force: true }); }
}

test("private-save writes the file and records a 'saved' event without contents", async () => {
  await withServer(async (url, dir) => {
    const envPath = join(dir, ".env");
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: T\ninputs:\n  - {type: file-edit, path: ${envPath}, private: true}\n---\n`);
    await new Promise(r => setTimeout(r, 200));

    const CONTENT = "DATABASE_URL=postgres://TOTALLY_FAKE_SECRET_FOR_TESTING@h/x";
    const res = await fetch(`${url}/api/private-save`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: "s1", name: "env", path: envPath, contents: CONTENT }),
    });
    expect(res.status).toBe(200);

    // File written
    expect(readFileSync(envPath, "utf8")).toBe(CONTENT);
    expect((statSync(envPath).mode & 0o777)).toBe(0o600);

    // Event recorded, contents absent
    const lines = readFileSync(join(dir, "events.jsonl"), "utf8");
    expect(lines).toContain('"type":"saved"');
    expect(lines).not.toContain("TOTALLY_FAKE_SECRET_FOR_TESTING");
  });
});

test("private-save rejects a path not declared in any screen", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: T\ninputs:\n  - {type: file-edit, path: ${join(dir, ".env")}, private: true}\n---\n`);
    await new Promise(r => setTimeout(r, 200));

    const res = await fetch(`${url}/api/private-save`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: "s1", name: "env", path: "/etc/passwd", contents: "x" }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/privacy.test.ts`
Expected: FAIL (404).

- [ ] **Step 3: Implement `privacy.ts`**

```typescript
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
```

- [ ] **Step 4: Add the route to `routes.ts`**

```typescript
import { assertDeclaredPath, savePrivate } from "./privacy";

// inside handle(), before the final return:
if (req.method === "POST" && url.pathname === "/api/private-save") {
  const body = await req.json().catch(() => null) as {
    screen_id?: string; name?: string; path?: string; contents?: string;
  } | null;
  if (!body?.screen_id || !body.name || !body.path || typeof body.contents !== "string") {
    return new Response("bad request", { status: 400 });
  }
  try {
    assertDeclaredPath(ctx.screens, body.screen_id, body.path);
  } catch (err) {
    return new Response((err as Error).message, { status: 400 });
  }
  try {
    const { bytes, sha256 } = savePrivate(body.path, body.contents);
    await ctx.events.append({
      type: "saved",
      screen_id: body.screen_id,
      name: body.name,
      path: body.path,
      bytes,
      sha256,
    });
    return Response.json({ ok: true, bytes, sha256 });
  } catch (err) {
    const errno = (err as NodeJS.ErrnoException).code ?? "UNKNOWN";
    await ctx.events.append({ type: "save_error", screen_id: body.screen_id, name: body.name, path: body.path, errno });
    return new Response("save failed", { status: 500 });
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/privacy.test.ts`
Expected: `2 pass`.

- [ ] **Step 6: Commit**

```bash
git add skills/brainstorming/companion/packages/server/src/privacy.ts skills/brainstorming/companion/packages/server/src/routes.ts skills/brainstorming/companion/packages/server/test/privacy.test.ts
git commit -m "$(cat <<'EOF'
feat(companion): private-save path writes file and emits saved event

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 13: Privacy regression property test

**Files:**
- Create: `skills/brainstorming/companion/packages/server/test/privacy.property.test.ts`

- [ ] **Step 1: Write the test**

```typescript
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("no combination of submissions ever writes private contents to events.jsonl", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try {
    const envPath = join(dir, ".env");
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: T\ninputs:\n  - {type: text, name: notes}\n  - {type: text, name: hidden, private: true}\n  - {type: file-edit, path: ${envPath}, private: true}\n---\n`);
    await new Promise(r => setTimeout(r, 200));

    const secrets = [
      "TOTALLY_FAKE_SECRET_FOR_TESTING_1",
      "TOTALLY_FAKE_SECRET_FOR_TESTING_2",
      "TOTALLY_FAKE_SECRET_FOR_TESTING_3",
    ];

    // Submit an answer that includes a private text input
    await fetch(`${ctl.url}/api/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        screen_id: "s1",
        client_submission_id: "a1",
        inputs: { notes: "visible", hidden: secrets[0] },
      }),
    });

    // Save a private file with a different secret
    await fetch(`${ctl.url}/api/private-save`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: "s1", name: "env", path: envPath, contents: secrets[1] }),
    });

    // Try the naive mistake: put the secret in a public input field
    await fetch(`${ctl.url}/api/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        screen_id: "s1",
        client_submission_id: "a2",
        inputs: { notes: "safe", hidden: secrets[2] },
      }),
    });

    const jsonl = readFileSync(join(dir, "events.jsonl"), "utf8");
    for (const secret of secrets) {
      expect(jsonl).not.toContain(secret);
    }
  } finally {
    await stopRunning(ctl);
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run it — must pass immediately**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/privacy.property.test.ts`
Expected: `1 pass`. If it fails, the filter in Task 11 (the `continue` on `private` or `file-edit`) is incomplete — fix and re-run. Do NOT weaken the test.

- [ ] **Step 3: Commit**

```bash
git add skills/brainstorming/companion/packages/server/test/privacy.property.test.ts
git commit -m "$(cat <<'EOF'
test(companion): privacy regression — secrets never reach events.jsonl

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 6: Decisions

### Task 14: Decisions repo with atomic status updates

**Files:**
- Create: `skills/brainstorming/companion/packages/server/src/decisions-repo.ts`
- Create: `skills/brainstorming/companion/packages/server/test/decisions-repo.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createDecisionsRepo } from "../src/decisions-repo";
import { ensureSessionDir } from "../src/session";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "comp-")); ensureSessionDir(dir); });

test("list parses decision files", () => {
  writeFileSync(join(dir, "decisions", "d1.md"),
    `---\nkind: decision\nid: d1\ntitle: T\nstatus: proposed\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n`);
  const repo = createDecisionsRepo(dir);
  const list = repo.list();
  expect(list).toHaveLength(1);
  expect(list[0].id).toBe("d1");
  expect(list[0].status).toBe("proposed");
});

test("updateStatus rewrites only the status field", () => {
  writeFileSync(join(dir, "decisions", "d1.md"),
    `---\nkind: decision\nid: d1\ntitle: T\nstatus: proposed\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n\n## Context\nSome text`);
  const repo = createDecisionsRepo(dir);
  repo.updateStatus("d1", "approved", "a");
  const raw = readFileSync(join(dir, "decisions", "d1.md"), "utf8");
  expect(raw).toContain("status: approved");
  expect(raw).toContain("## Context");
  expect(raw).toContain("Some text");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/decisions-repo.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `decisions-repo.ts`**

```typescript
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
      return { id: front.id, title: front.title, status: front.status, path };
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/decisions-repo.test.ts`
Expected: `2 pass`.

- [ ] **Step 5: Commit**

```bash
git add skills/brainstorming/companion/packages/server/src/decisions-repo.ts skills/brainstorming/companion/packages/server/test/decisions-repo.test.ts
git commit -m "$(cat <<'EOF'
feat(companion): decisions repo with atomic status updates

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 15: GET /api/decisions and POST /api/decisions/:id

**Files:**
- Modify: `routes.ts`
- Modify: `server.ts` (inject decisions repo into ctx)

- [ ] **Step 1: Write the failing test**

Create `packages/server/test/routes.decisions.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

async function withServer(fn: (url: string, dir: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try { await fn(ctl.url, dir); } finally { await stopRunning(ctl); rmSync(dir, { recursive: true, force: true }); }
}

test("GET /api/decisions lists decisions", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "decisions", "d1.md"),
      `---\nkind: decision\nid: d1\ntitle: T\nstatus: proposed\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n`);
    const list = await (await fetch(`${url}/api/decisions`)).json();
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("proposed");
  });
});

test("POST /api/decisions/:id updates status and appends event", async () => {
  await withServer(async (url, dir) => {
    writeFileSync(join(dir, "decisions", "d1.md"),
      `---\nkind: decision\nid: d1\ntitle: T\nstatus: proposed\noptions:\n  - {id: a, label: A}\n  - {id: b, label: B}\n---\n`);
    const res = await fetch(`${url}/api/decisions/d1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved", chosen_option: "a" }),
    });
    expect(res.status).toBe(200);

    // File updated
    expect(readFileSync(join(dir, "decisions", "d1.md"), "utf8")).toContain("status: approved");
    // Event logged
    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean);
    const ev = JSON.parse(lines[lines.length - 1]!);
    expect(ev.type).toBe("decision");
    expect(ev.id).toBe("d1");
    expect(ev.status).toBe("approved");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/routes.decisions.test.ts`
Expected: FAIL (404).

- [ ] **Step 3: Extend `routes.ts`**

```typescript
import type { DecisionsRepo } from "./decisions-repo";

export interface RouteCtx {
  screens: ScreensRepo;
  sse: SseHub;
  events: EventsWriter;
  idempotency: IdempotencyStore;
  decisions: DecisionsRepo;
}

// inside handle(), before the final return:

if (req.method === "GET" && url.pathname === "/api/decisions") {
  return Response.json(ctx.decisions.list());
}
if (req.method === "POST" && url.pathname.startsWith("/api/decisions/")) {
  const id = url.pathname.slice("/api/decisions/".length);
  const body = await req.json().catch(() => null) as {
    status?: "approved"|"revised"|"rejected"|"proposed"; chosen_option?: string; note?: string;
  } | null;
  if (!body?.status) return new Response("bad request", { status: 400 });
  try {
    ctx.decisions.updateStatus(id, body.status, body.chosen_option, body.note);
  } catch (err) {
    return new Response((err as Error).message, { status: 404 });
  }
  await ctx.events.append({ type: "decision", id, status: body.status, chosen_option: body.chosen_option, note: body.note });
  ctx.sse.push("refresh", { kind: "decision", id });
  return Response.json({ ok: true });
}
```

- [ ] **Step 4: Inject in `server.ts`**

```typescript
import { createDecisionsRepo } from "./decisions-repo";
const decisions = createDecisionsRepo(opts.sessionDir);
const ctx = { screens, sse, events, idempotency, decisions };
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/routes.decisions.test.ts`
Expected: `2 pass`. Full suite: `bun test` — still all green.

- [ ] **Step 6: Commit**

```bash
git add skills/brainstorming/companion/packages/server/src/routes.ts skills/brainstorming/companion/packages/server/src/server.ts skills/brainstorming/companion/packages/server/test/routes.decisions.test.ts
git commit -m "$(cat <<'EOF'
feat(companion): decisions routes with atomic updates and SSE refresh

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 16: Docs roots and /api/docs

**Files:**
- Modify: `routes.ts`
- Modify: `server.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/server/test/routes.docs.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("GET /api/docs lists registered markdown files", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const docRoot = mkdtempSync(join(tmpdir(), "docs-"));
  mkdirSync(join(docRoot, "sub"));
  writeFileSync(join(docRoot, "README.md"), "# hi");
  writeFileSync(join(docRoot, "sub", "other.md"), "x");
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[docRoot], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try {
    const list = await (await fetch(`${ctl.url}/api/docs`)).json() as Array<{ path: string }>;
    const paths = list.map(e => e.path).sort();
    expect(paths.some(p => p.endsWith("README.md"))).toBe(true);
    expect(paths.some(p => p.endsWith("sub/other.md"))).toBe(true);

    const body = await (await fetch(`${ctl.url}/api/docs/file?path=${encodeURIComponent(join(docRoot, "README.md"))}`)).text();
    expect(body).toContain("# hi");
  } finally {
    await stopRunning(ctl);
    rmSync(dir, { recursive: true, force: true });
    rmSync(docRoot, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/routes.docs.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add to `routes.ts`**

```typescript
import { readdirSync, statSync, readFileSync } from "fs";
import { join, relative } from "path";

export interface RouteCtx {
  screens: ScreensRepo;
  sse: SseHub;
  events: EventsWriter;
  idempotency: IdempotencyStore;
  decisions: DecisionsRepo;
  docRoots: string[];
}

function listMarkdown(root: string): string[] {
  const out: string[] = [];
  function walk(d: string) {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (name.endsWith(".md")) out.push(p);
    }
  }
  walk(root);
  return out;
}

function isUnder(root: string, target: string): boolean {
  const rel = relative(root, target);
  return !rel.startsWith("..") && !rel.startsWith("/");
}

// Add inside handle():

if (req.method === "GET" && url.pathname === "/api/docs") {
  const out: Array<{ root: string; path: string; rel: string }> = [];
  for (const root of ctx.docRoots) {
    for (const p of listMarkdown(root)) {
      out.push({ root, path: p, rel: relative(root, p) });
    }
  }
  return Response.json(out);
}
if (req.method === "GET" && url.pathname === "/api/docs/file") {
  const p = url.searchParams.get("path");
  if (!p || !ctx.docRoots.some(r => isUnder(r, p))) {
    return new Response("forbidden", { status: 403 });
  }
  return new Response(readFileSync(p, "utf8"), { headers: { "content-type": "text/markdown" } });
}
```

- [ ] **Step 4: Wire `docRoots` in `server.ts`**

```typescript
const ctx = { screens, sse, events, idempotency, decisions, docRoots: opts.docRoots };
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd skills/brainstorming/companion && bun test packages/server/test/routes.docs.test.ts`
Expected: `1 pass`. Full suite: `bun test`.

- [ ] **Step 6: Commit**

```bash
git add skills/brainstorming/companion/packages/server/src/routes.ts skills/brainstorming/companion/packages/server/src/server.ts skills/brainstorming/companion/packages/server/test/routes.docs.test.ts
git commit -m "$(cat <<'EOF'
feat(companion): /api/docs listing and sandboxed file reads

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 7: Web Scaffold

### Task 17: Web package with Vite + Preact + preact-iso

**Files:**
- Create: `skills/brainstorming/companion/packages/web/package.json`
- Create: `skills/brainstorming/companion/packages/web/tsconfig.json`
- Create: `skills/brainstorming/companion/packages/web/vite.config.ts`
- Create: `skills/brainstorming/companion/packages/web/index.html`
- Create: `skills/brainstorming/companion/packages/web/src/main.tsx`
- Create: `skills/brainstorming/companion/packages/web/src/app.tsx`
- Create: `skills/brainstorming/companion/packages/web/src/styles.css`

- [ ] **Step 1: Create web/package.json**

```json
{
  "name": "@companion/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "test": "bun test"
  },
  "dependencies": {
    "preact": "^10.22.0",
    "preact-iso": "^2.6.0",
    "markdown-it": "^14.1.0"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "@preact/preset-vite": "^2.8.0",
    "@companion/shared": "workspace:*",
    "@types/markdown-it": "^14.1.0"
  }
}
```

- [ ] **Step 2: Create web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "paths": { "@companion/shared": ["../../shared/src"] }
  }
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  build: { outDir: "dist", target: "es2022" },
  server: { proxy: { "/api": "http://localhost:3344" } },
});
```

- [ ] **Step 4: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Visual Companion</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create src/main.tsx**

```tsx
import { render } from "preact";
import { App } from "./app";

render(<App />, document.getElementById("root")!);
```

- [ ] **Step 6: Create src/app.tsx**

```tsx
import { LocationProvider, Router, Route } from "preact-iso";
import { Shell } from "./layout/Shell";

export function App() {
  return (
    <LocationProvider>
      <Shell>
        <Router>
          <Route path="/" component={Home} />
          <Route default component={NotFound} />
        </Router>
      </Shell>
    </LocationProvider>
  );
}

function Home() {
  return <p>Pick a screen from the sidebar.</p>;
}

function NotFound() {
  return <p>Not found.</p>;
}
```

- [ ] **Step 7: Create src/layout/Shell.tsx** (stub — real sidebar comes in Task 18)

```tsx
import type { ComponentChildren } from "preact";

export function Shell({ children }: { children: ComponentChildren }) {
  return (
    <div class="shell">
      <aside class="sidebar">Sidebar</aside>
      <main class="main">{children}</main>
      <aside class="activity">Activity</aside>
    </div>
  );
}
```

- [ ] **Step 8: Create src/styles.css**

```css
:root { --bg: #0f1115; --fg: #e6e6e6; --accent: #7aa2f7; --muted: #6b7280; --border: #1f2937; font-family: ui-sans-serif, system-ui, sans-serif; }
body { margin: 0; background: var(--bg); color: var(--fg); }
.shell { display: grid; grid-template-columns: 260px 1fr 260px; height: 100vh; }
.sidebar, .activity { border: 1px solid var(--border); padding: 12px; overflow: auto; background: #13161c; }
.main { padding: 16px; overflow: auto; }
a { color: var(--accent); }
button { background: var(--accent); color: #0f1115; border: 0; padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; }
button:hover { filter: brightness(1.1); }
fieldset { border: 1px solid var(--border); border-radius: 6px; padding: 12px; }
input, textarea { background: #13161c; color: var(--fg); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; width: 100%; box-sizing: border-box; }
textarea { min-height: 120px; }
```

- [ ] **Step 9: Install and build to verify**

Run: `cd skills/brainstorming/companion && bun install && bun run --cwd packages/web build`
Expected: `dist/` created with `index.html` and assets. No type errors.

- [ ] **Step 10: Commit**

```bash
git add skills/brainstorming/companion/packages/web skills/brainstorming/companion/bun.lockb
git commit -m "$(cat <<'EOF'
feat(companion): web package scaffold with preact-iso

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 18: Static serving from `web/dist` + client API + SSE hook

**Files:**
- Create: `skills/brainstorming/companion/packages/web/src/lib/api.ts`
- Create: `skills/brainstorming/companion/packages/web/src/lib/sse.ts`
- Modify: `skills/brainstorming/companion/packages/server/src/server.ts` (serve static)
- Modify: `skills/brainstorming/companion/packages/server/src/routes.ts` (static fallback)

- [ ] **Step 1: Write `api.ts`**

```typescript
export interface ScreenSummary { id: string; kind: "question"|"demo"|"decision"; title: string; pinned: boolean; }
export interface DecisionSummary { id: string; title: string; status: "proposed"|"approved"|"revised"|"rejected"; }
export interface DocEntry { root: string; path: string; rel: string; }

export async function listScreens(): Promise<ScreenSummary[]> {
  return (await fetch("/api/screens")).json();
}
export async function getScreen(id: string) {
  return (await fetch(`/api/screens/${encodeURIComponent(id)}`)).json();
}
export async function listDecisions(): Promise<DecisionSummary[]> {
  return (await fetch("/api/decisions")).json();
}
export async function listDocs(): Promise<DocEntry[]> {
  return (await fetch("/api/docs")).json();
}
export async function getDoc(path: string): Promise<string> {
  return (await fetch(`/api/docs/file?path=${encodeURIComponent(path)}`)).text();
}
export async function submitAnswer(screenId: string, inputs: Record<string, unknown>) {
  const client_submission_id = crypto.randomUUID();
  return (await fetch("/api/answer", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ screen_id: screenId, client_submission_id, inputs }),
  })).json();
}
export async function privateSave(screenId: string, name: string, path: string, contents: string) {
  return (await fetch("/api/private-save", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ screen_id: screenId, name, path, contents }),
  })).json();
}
export async function updateDecision(id: string, status: string, chosen_option?: string, note?: string) {
  return (await fetch(`/api/decisions/${encodeURIComponent(id)}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ status, chosen_option, note }),
  })).json();
}
```

- [ ] **Step 2: Write `sse.ts`**

```typescript
import { useEffect, useState } from "preact/hooks";

export interface RefreshEvent { kind: "screen"|"decision"; id: string; action?: string; }

export function useRefresh(onEvent: (ev: RefreshEvent) => void) {
  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.addEventListener("refresh", (e: MessageEvent) => {
      try { onEvent(JSON.parse(e.data)); } catch {}
    });
    return () => es.close();
  }, []);
}

export function useTick(): number {
  const [tick, setTick] = useState(0);
  useRefresh(() => setTick(t => t + 1));
  return tick;
}
```

- [ ] **Step 3: Serve `web/dist` from the server**

Modify `routes.ts` — add a final static fallback BEFORE the 404:

```typescript
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

const WEB_DIST = resolve(import.meta.dir, "..", "..", "web", "dist");

function serveStatic(url: URL): Response | undefined {
  let rel = url.pathname === "/" ? "/index.html" : url.pathname;
  // SPA fallback: any non-api path with no extension falls through to index.html
  if (!rel.startsWith("/api") && !/\.[a-z0-9]+$/i.test(rel)) rel = "/index.html";
  const p = join(WEB_DIST, rel);
  if (!p.startsWith(WEB_DIST) || !existsSync(p)) return undefined;
  const ext = p.slice(p.lastIndexOf(".") + 1);
  const ct = ({ html:"text/html", js:"text/javascript", css:"text/css", svg:"image/svg+xml", map:"application/json" } as Record<string,string>)[ext] ?? "application/octet-stream";
  return new Response(readFileSync(p), { headers: { "content-type": ct } });
}

// Replace the final `return new Response("not found", { status: 404 });` with:
const asset = serveStatic(url);
if (asset) return asset;
return new Response("not found", { status: 404 });
```

- [ ] **Step 4: Build web and verify serving**

Run: `bun run --cwd packages/web build`
Then write a quick manual test:

Run:
```bash
( cd skills/brainstorming/companion && bun run packages/server/src/cli.ts start --session-dir /tmp/comp-manual --foreground ) &
SERVER_PID=$!
sleep 0.5
curl -s http://127.0.0.1:$(jq -r .port /tmp/comp-manual/server-info)/ | head -5
kill $SERVER_PID
```

Expected: first five lines include `<!doctype html>` and `<div id="root"></div>`.

- [ ] **Step 5: Commit**

```bash
git add skills/brainstorming/companion/packages/web/src/lib skills/brainstorming/companion/packages/server/src/routes.ts
git commit -m "$(cat <<'EOF'
feat(companion): serve web/dist + client API + SSE hook

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 8: Sidebar

### Task 19: Sidebar with screens, decisions, docs sections

**Files:**
- Modify: `packages/web/src/layout/Shell.tsx`
- Create: `packages/web/src/layout/Sidebar.tsx`
- Create: `packages/web/src/layout/Activity.tsx`

- [ ] **Step 1: Write `Sidebar.tsx`**

```tsx
import { useEffect, useState } from "preact/hooks";
import { listScreens, listDecisions, listDocs, type ScreenSummary, type DecisionSummary, type DocEntry } from "../lib/api";
import { useRefresh } from "../lib/sse";

export function Sidebar() {
  const [screens, setScreens] = useState<ScreenSummary[]>([]);
  const [decisions, setDecisions] = useState<DecisionSummary[]>([]);
  const [docs, setDocs] = useState<DocEntry[]>([]);

  async function refresh() {
    setScreens(await listScreens());
    setDecisions(await listDecisions());
    setDocs(await listDocs());
  }
  useEffect(() => { void refresh(); }, []);
  useRefresh(() => { void refresh(); });

  return (
    <nav class="sidebar-nav">
      <Section title="Screens">
        {screens.map(s => (
          <a key={s.id} href={`/screen/${s.id}`} class="sidebar-item" data-kind={s.kind}>
            <span class="dot" /> {s.title}
          </a>
        ))}
      </Section>
      <Section title="Decisions">
        {decisions.map(d => (
          <a key={d.id} href={`/decisions/${d.id}`} class="sidebar-item" data-status={d.status}>
            <span class={`badge badge-${d.status}`} /> {d.title}
          </a>
        ))}
      </Section>
      <Section title="Docs">
        {docs.map(d => (
          <a key={d.path} href={`/docs/${encodeURIComponent(d.path)}`} class="sidebar-item">
            {d.rel}
          </a>
        ))}
      </Section>
    </nav>
  );
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <section class="sidebar-section">
      <h4 class="sidebar-heading">{title}</h4>
      <div class="sidebar-list">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: Create `Activity.tsx` (minimal for now)**

```tsx
import { useState } from "preact/hooks";
import { useRefresh } from "../lib/sse";

export function Activity() {
  const [events, setEvents] = useState<Array<{ kind: string; id: string; ts: number }>>([]);
  useRefresh((ev) => setEvents(prev => [{ kind: ev.kind, id: ev.id, ts: Date.now() }, ...prev].slice(0, 20)));
  return (
    <div class="activity-list">
      <h4>Recent</h4>
      <ul>
        {events.map((e, i) => (
          <li key={i}>{new Date(e.ts).toLocaleTimeString()} — {e.kind}:{e.id}</li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Update `Shell.tsx` to use them**

```tsx
import type { ComponentChildren } from "preact";
import { Sidebar } from "./Sidebar";
import { Activity } from "./Activity";

export function Shell({ children }: { children: ComponentChildren }) {
  return (
    <div class="shell">
      <aside class="sidebar"><Sidebar /></aside>
      <main class="main">{children}</main>
      <aside class="activity"><Activity /></aside>
    </div>
  );
}
```

- [ ] **Step 4: Append sidebar styles to `styles.css`**

```css
.sidebar-heading { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin: 16px 0 4px; }
.sidebar-section:first-child .sidebar-heading { margin-top: 0; }
.sidebar-list { display: flex; flex-direction: column; gap: 2px; }
.sidebar-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; color: var(--fg); text-decoration: none; font-size: 13px; }
.sidebar-item:hover { background: rgba(255,255,255,0.05); }
.sidebar-item .dot { width: 6px; height: 6px; background: var(--muted); border-radius: 50%; }
.badge { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.badge-proposed { background: #eab308; }
.badge-approved { background: #22c55e; }
.badge-revised  { background: #f97316; }
.badge-rejected { background: #ef4444; }
.activity-list h4 { color: var(--muted); font-size: 11px; text-transform: uppercase; margin: 0 0 8px; }
.activity-list ul { list-style: none; padding: 0; margin: 0; font-size: 12px; }
.activity-list li { padding: 4px 0; color: var(--muted); }
```

- [ ] **Step 5: Build and verify manually**

Run: `bun run --cwd packages/web build`
Expected: clean build, new chunks for sidebar. No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add skills/brainstorming/companion/packages/web/src/layout skills/brainstorming/companion/packages/web/src/styles.css
git commit -m "$(cat <<'EOF'
feat(companion): sidebar with screens, decisions, docs sections

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 9: Screen Renderer — Question Kind

### Task 20: Markdown renderer + ScreenView route

**Files:**
- Create: `packages/web/src/lib/markdown.ts`
- Create: `packages/web/src/screens/ScreenView.tsx`
- Modify: `packages/web/src/app.tsx`

- [ ] **Step 1: Write `markdown.ts`**

```typescript
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

export function renderMarkdown(body: string): string {
  return md.render(body);
}
```

- [ ] **Step 2: Write `ScreenView.tsx`** (renders body + dispatches to input components in Task 21)

```tsx
import { useEffect, useState } from "preact/hooks";
import { getScreen, submitAnswer } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import { RadioInput } from "../inputs/RadioInput";
import { MultiInput } from "../inputs/MultiInput";
import { TextInput } from "../inputs/TextInput";
import { CodeInput } from "../inputs/CodeInput";
import { FileEditInput } from "../inputs/FileEditInput";

export function ScreenView({ params }: { params: { id: string } }) {
  const [screen, setScreen] = useState<any>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { void getScreen(params.id).then(setScreen); }, [params.id]);
  if (!screen) return <p>Loading…</p>;
  const { frontmatter: fm, body } = screen;
  if (fm.kind !== "question") return <p>Wrong kind for this view.</p>;

  function setValue(name: string, v: unknown) { setValues(prev => ({ ...prev, [name]: v })); }

  async function onSubmit(e: Event) {
    e.preventDefault();
    await submitAnswer(fm.id, values);
    setSubmitted(true);
  }

  return (
    <article class="screen">
      <h2>{fm.title}</h2>
      <div class="markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
      <form onSubmit={onSubmit} class="screen-form">
        {fm.inputs.map((def: any) => {
          switch (def.type) {
            case "radio": return <RadioInput key={def.name} def={def} value={values[def.name]} onChange={v => setValue(def.name, v)} />;
            case "multi": return <MultiInput key={def.name} def={def} value={values[def.name]} onChange={v => setValue(def.name, v)} />;
            case "text":  return <TextInput  key={def.name} def={def} value={values[def.name]} onChange={v => setValue(def.name, v)} />;
            case "code":  return <CodeInput  key={def.name} def={def} value={values[def.name]} onChange={v => setValue(def.name, v)} />;
            case "file-edit": return <FileEditInput key={def.path} def={def} screenId={fm.id} />;
            default: return null;
          }
        })}
        <button type="submit" disabled={submitted}>{submitted ? "Submitted" : "Submit"}</button>
      </form>
    </article>
  );
}
```

- [ ] **Step 3: Wire route in `app.tsx`**

```tsx
import { ScreenView } from "./screens/ScreenView";

// inside <Router>:
<Route path="/screen/:id" component={ScreenView} />
```

- [ ] **Step 4: Append form styles to `styles.css`**

```css
.markdown { line-height: 1.6; }
.markdown h2 { margin-top: 24px; }
.markdown code { background: #13161c; padding: 1px 4px; border-radius: 4px; }
.markdown pre { background: #13161c; padding: 12px; border-radius: 6px; overflow: auto; }
.screen-form { display: flex; flex-direction: column; gap: 16px; margin-top: 24px; max-width: 720px; }
.screen-form label { display: block; font-weight: 600; margin-bottom: 6px; }
```

- [ ] **Step 5: Typecheck via build**

Run: `bun run --cwd packages/web build`
Expected: succeeds once Task 21 creates the input files. For now it WILL fail on missing imports — that is fine, move straight to Task 21.

### Task 21: Radio, Multi, Text inputs

**Files:**
- Create: `packages/web/src/inputs/RadioInput.tsx`
- Create: `packages/web/src/inputs/MultiInput.tsx`
- Create: `packages/web/src/inputs/TextInput.tsx`

- [ ] **Step 1: `RadioInput.tsx`**

```tsx
export function RadioInput({ def, value, onChange }: { def: any; value: unknown; onChange: (v: string) => void }) {
  const options = def.options.map((o: any) => typeof o === "string" ? { value: o, label: o } : o);
  return (
    <fieldset>
      <legend>{def.label ?? def.name}</legend>
      {options.map((o: any) => (
        <label key={o.value} style={{ display: "block", fontWeight: 400 }}>
          <input type="radio" name={def.name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} /> {o.label}
        </label>
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 2: `MultiInput.tsx`**

```tsx
export function MultiInput({ def, value, onChange }: { def: any; value: unknown; onChange: (v: string[]) => void }) {
  const options = def.options.map((o: any) => typeof o === "string" ? { value: o, label: o } : o);
  const arr = Array.isArray(value) ? value as string[] : [];
  function toggle(v: string) {
    onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  }
  return (
    <fieldset>
      <legend>{def.label ?? def.name}</legend>
      {options.map((o: any) => (
        <label key={o.value} style={{ display: "block", fontWeight: 400 }}>
          <input type="checkbox" checked={arr.includes(o.value)} onChange={() => toggle(o.value)} /> {o.label}
        </label>
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 3: `TextInput.tsx`**

```tsx
export function TextInput({ def, value, onChange }: { def: any; value: unknown; onChange: (v: string) => void }) {
  const v = typeof value === "string" ? value : "";
  return (
    <div>
      <label>{def.label ?? def.name}</label>
      {def.multiline
        ? <textarea placeholder={def.placeholder} value={v} onInput={(e: any) => onChange(e.currentTarget.value)} />
        : <input    type="text" placeholder={def.placeholder} value={v} onInput={(e: any) => onChange(e.currentTarget.value)} />}
    </div>
  );
}
```

- [ ] **Step 4: Commit (code + forms together)**

Note: The build will still fail until Task 22's CodeInput and Task 23's FileEditInput land. We commit these three in one unit because they share plumbing.

```bash
git add skills/brainstorming/companion/packages/web/src/screens/ScreenView.tsx skills/brainstorming/companion/packages/web/src/lib/markdown.ts skills/brainstorming/companion/packages/web/src/inputs/RadioInput.tsx skills/brainstorming/companion/packages/web/src/inputs/MultiInput.tsx skills/brainstorming/companion/packages/web/src/inputs/TextInput.tsx skills/brainstorming/companion/packages/web/src/app.tsx skills/brainstorming/companion/packages/web/src/styles.css
git commit -m "$(cat <<'EOF'
feat(companion): question screen renderer + radio/multi/text inputs

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 22: CodeInput with lazy CodeMirror 6

**Files:**
- Create: `packages/web/src/lib/codemirror.ts`
- Create: `packages/web/src/inputs/CodeInput.tsx`
- Modify: `packages/web/package.json` (add CodeMirror deps)

- [ ] **Step 1: Add deps**

Append to `packages/web/package.json` `dependencies`:

```json
"@codemirror/state": "^6.4.0",
"@codemirror/view":  "^6.26.0",
"@codemirror/language": "^6.10.0",
"@codemirror/lang-json": "^6.0.1",
"@codemirror/lang-yaml": "^6.1.0",
"@codemirror/lang-javascript": "^6.2.0"
```

Run: `cd skills/brainstorming/companion && bun install`.

- [ ] **Step 2: Write `lib/codemirror.ts`** (lazy loader)

```typescript
export async function createEditor(parent: HTMLElement, value: string, language: string, onChange: (v: string) => void) {
  const [{ EditorState }, { EditorView, keymap, lineNumbers }, { defaultKeymap }, { syntaxHighlighting, defaultHighlightStyle }] = await Promise.all([
    import("@codemirror/state"),
    import("@codemirror/view"),
    import("@codemirror/commands"),
    import("@codemirror/language"),
  ]);

  let lang: any;
  switch (language) {
    case "json":       lang = (await import("@codemirror/lang-json")).json(); break;
    case "yaml":       lang = (await import("@codemirror/lang-yaml")).yaml(); break;
    case "js":
    case "ts":
    case "javascript":
    case "typescript": lang = (await import("@codemirror/lang-javascript")).javascript({ typescript: language.includes("ts") }); break;
    default: lang = [];
  }

  const state = EditorState.create({
    doc: value,
    extensions: [
      lineNumbers(),
      keymap.of(defaultKeymap),
      syntaxHighlighting(defaultHighlightStyle),
      lang,
      EditorView.updateListener.of(u => { if (u.docChanged) onChange(u.state.doc.toString()); }),
    ],
  });
  return new EditorView({ state, parent });
}
```

- [ ] **Step 3: Write `CodeInput.tsx`**

```tsx
import { useEffect, useRef } from "preact/hooks";
import { createEditor } from "../lib/codemirror";

export function CodeInput({ def, value, onChange }: { def: any; value: unknown; onChange: (v: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hostRef.current) return;
    let destroy: (() => void) | undefined;
    void createEditor(hostRef.current, typeof value === "string" ? value : "", def.language, onChange).then(view => {
      destroy = () => view.destroy();
    });
    return () => destroy?.();
  }, []);
  return (
    <div>
      <label>{def.label ?? def.name} <span class="muted">({def.language})</span></label>
      <div class="cm-host" ref={hostRef} />
    </div>
  );
}
```

- [ ] **Step 4: Add host styles**

Append to `styles.css`:

```css
.cm-host { border: 1px solid var(--border); border-radius: 6px; overflow: hidden; min-height: 120px; }
.muted { color: var(--muted); font-weight: 400; font-size: 12px; }
```

- [ ] **Step 5: Manual build verify**

Run: `bun run --cwd packages/web build`
Expected: still fails on missing `FileEditInput` — that's fine, continuing to Task 23.

- [ ] **Step 6: Commit alongside Task 23** (hold this commit until Task 23 completes)

### Task 23: FileEditInput (private)

**Files:**
- Create: `packages/web/src/inputs/FileEditInput.tsx`

- [ ] **Step 1: Write `FileEditInput.tsx`**

```tsx
import { useEffect, useRef, useState } from "preact/hooks";
import { createEditor } from "../lib/codemirror";
import { privateSave } from "../lib/api";

export function FileEditInput({ def, screenId }: { def: any; screenId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const valueRef = useRef<string>("");

  useEffect(() => {
    if (!hostRef.current) return;
    let destroy: (() => void) | undefined;
    void createEditor(hostRef.current, "", def.language ?? "text", v => { valueRef.current = v; }).then(view => {
      destroy = () => view.destroy();
    });
    return () => destroy?.();
  }, []);

  async function save() {
    setStatus("saving");
    try {
      await privateSave(screenId, def.name ?? def.path, def.path, valueRef.current);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div class="file-edit">
      <label>
        Edit <code>{def.path}</code> <span class="badge-private">private</span>
      </label>
      <p class="muted">Contents are written directly to the target path. They are never sent through the answer channel and never appear in events.jsonl.</p>
      <div class="cm-host" ref={hostRef} />
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <button type="button" onClick={save} disabled={status === "saving"}>Save</button>
        <span class="muted">{status}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append styles**

```css
.badge-private { background: #eab308; color: #0f1115; font-size: 10px; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; margin-left: 8px; }
.file-edit { border: 1px dashed #eab308; border-radius: 6px; padding: 12px; }
```

- [ ] **Step 3: Build the full web package**

Run: `bun run --cwd packages/web build`
Expected: clean build, no type errors. `dist/index.html` regenerated.

- [ ] **Step 4: Commit Tasks 22 + 23 together**

```bash
git add skills/brainstorming/companion/packages/web/src/lib/codemirror.ts skills/brainstorming/companion/packages/web/src/inputs/CodeInput.tsx skills/brainstorming/companion/packages/web/src/inputs/FileEditInput.tsx skills/brainstorming/companion/packages/web/src/styles.css skills/brainstorming/companion/packages/web/package.json skills/brainstorming/companion/bun.lockb
git commit -m "$(cat <<'EOF'
feat(companion): CodeInput (lazy CodeMirror) and FileEditInput (private)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 10: Demo Renderer

### Task 24: DemoView with sandboxed iframe and postMessage bridge

**Files:**
- Create: `packages/web/src/screens/DemoView.tsx`
- Modify: `packages/web/src/app.tsx`
- Modify: `packages/server/src/routes.ts` (new `/api/demo-event` + `/api/demo-asset`)

- [ ] **Step 1: Server routes for demo**

Add to `routes.ts`:

```typescript
// GET /api/demo-asset?screen_id=...&file=...  — reads the file the screen's frontmatter references, bounded to the screen file's directory
if (req.method === "GET" && url.pathname === "/api/demo-asset") {
  const sid = url.searchParams.get("screen_id");
  const file = url.searchParams.get("file");
  if (!sid || !file) return new Response("bad request", { status: 400 });
  const s = ctx.screens.get(sid);
  if (!s || s.frontmatter.kind !== "demo") return new Response("not found", { status: 404 });
  const { dirname, resolve, relative } = await import("path");
  const { readFileSync, existsSync } = await import("fs");
  const base = dirname(s.path);
  const target = resolve(base, file);
  if (relative(base, target).startsWith("..")) return new Response("forbidden", { status: 403 });
  if (!existsSync(target)) return new Response("not found", { status: 404 });
  return new Response(readFileSync(target, "utf8"));
}

// POST /api/demo-event  — frontend forwards postMessage events here; server rate-limits + emits
if (req.method === "POST" && url.pathname === "/api/demo-event") {
  const body = await req.json().catch(() => null) as { screen_id?: string; name?: string; data?: unknown } | null;
  if (!body?.screen_id || !body.name) return new Response("bad request", { status: 400 });
  // very simple fixed-window rate limit: 10/sec per screen
  const now = Date.now();
  demoWindow.push({ ts: now, screen: body.screen_id });
  while (demoWindow.length && now - demoWindow[0]!.ts > 1000) demoWindow.shift();
  const inWindow = demoWindow.filter(e => e.screen === body.screen_id).length;
  if (inWindow > 10) {
    dropped++;
    return Response.json({ ok: true, throttled: true });
  }
  if (dropped > 0) {
    await ctx.events.append({ type: "demo_event_throttled", screen_id: body.screen_id, dropped });
    dropped = 0;
  }
  await ctx.events.append({ type: "demo_event", screen_id: body.screen_id, name: body.name, data: body.data });
  return Response.json({ ok: true });
}
```

Declare the state at module top of `routes.ts`:

```typescript
const demoWindow: Array<{ ts: number; screen: string }> = [];
let dropped = 0;
```

- [ ] **Step 2: Write `DemoView.tsx`**

```tsx
import { useEffect, useMemo, useState } from "preact/hooks";
import { getScreen, updateDecision } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";

export function DemoView({ params }: { params: { id: string } }) {
  const [screen, setScreen] = useState<any>(null);
  const [html, setHtml] = useState<string>("");
  const [note, setNote] = useState<string>("");

  useEffect(() => { void getScreen(params.id).then(setScreen); }, [params.id]);

  useEffect(() => {
    if (!screen || screen.frontmatter.kind !== "demo") return;
    const { demo } = screen.frontmatter;
    (async () => {
      const htmlBody = demo.inlineHtml ?? await (await fetch(`/api/demo-asset?screen_id=${params.id}&file=${encodeURIComponent(demo.html)}`)).text();
      const css = demo.css ? await (await fetch(`/api/demo-asset?screen_id=${params.id}&file=${encodeURIComponent(demo.css)}`)).text() : "";
      const js  = demo.js  ? await (await fetch(`/api/demo-asset?screen_id=${params.id}&file=${encodeURIComponent(demo.js)}`)).text()  : "";
      const bridge = `
        <script>
          window.__emit = (name, data) =>
            window.parent.postMessage({ kind: "demo_event", name, data }, "*");
        </script>`;
      setHtml(`<!doctype html><html><head><style>${css}</style></head><body>${htmlBody}${bridge}<script>${js}</script></body></html>`);
    })();
  }, [screen?.frontmatter?.id]);

  useEffect(() => {
    function listener(e: MessageEvent) {
      if (!e.data || e.data.kind !== "demo_event") return;
      void fetch("/api/demo-event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ screen_id: params.id, name: e.data.name, data: e.data.data }),
      });
    }
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [params.id]);

  if (!screen) return <p>Loading…</p>;
  const fm = screen.frontmatter;
  if (fm.kind !== "demo") return <p>Wrong kind.</p>;

  async function act(type: "approve"|"revise"|"reject") {
    await fetch("/api/demo-event", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: params.id, name: type, data: { note } }),
    });
  }

  return (
    <article>
      <h2>{fm.title}</h2>
      <div class="markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(screen.body) }} />
      <iframe
        class="demo-frame"
        sandbox="allow-scripts"
        srcDoc={html}
        style={{ width: fm.demo.viewport.width, height: fm.demo.viewport.height, border: "1px solid var(--border)", borderRadius: 6 }}
      />
      <div class="actions" style={{ marginTop: 12, display: "flex", gap: 8 }}>
        {fm.actions.map((a: any) =>
          <button key={a.type} onClick={() => act(a.type)}>{a.label}</button>)}
      </div>
      <textarea placeholder="Note (for revise/reject)" value={note} onInput={(e: any) => setNote(e.currentTarget.value)} style={{ marginTop: 8 }} />
    </article>
  );
}
```

- [ ] **Step 3: Wire route**

```tsx
<Route path="/demo/:id" component={DemoView} />
```

and update `Sidebar.tsx` so a screen with `kind === "demo"` links to `/demo/:id`:

```tsx
// replace the single <a href={`/screen/${s.id}`}> with:
<a key={s.id} href={s.kind === "demo" ? `/demo/${s.id}` : s.kind === "decision" ? `/decisions/${s.id}` : `/screen/${s.id}`} class="sidebar-item" data-kind={s.kind}>
```

- [ ] **Step 4: Build, run, manual smoke**

Run: `bun run --cwd packages/web build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add skills/brainstorming/companion/packages/web/src/screens/DemoView.tsx skills/brainstorming/companion/packages/web/src/layout/Sidebar.tsx skills/brainstorming/companion/packages/web/src/app.tsx skills/brainstorming/companion/packages/server/src/routes.ts
git commit -m "$(cat <<'EOF'
feat(companion): demo screen renderer with sandboxed iframe + event bridge

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 11: Decision Renderer

### Task 25: DecisionView

**Files:**
- Create: `packages/web/src/screens/DecisionView.tsx`
- Modify: `packages/web/src/app.tsx`

- [ ] **Step 1: Write `DecisionView.tsx`**

```tsx
import { useEffect, useState } from "preact/hooks";
import { getScreen, updateDecision } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";

export function DecisionView({ params }: { params: { id: string } }) {
  const [screen, setScreen] = useState<any>(null);
  const [chosen, setChosen] = useState<string>("");
  const [note, setNote] = useState<string>("");

  useEffect(() => { void getScreen(params.id).then(setScreen); }, [params.id]);
  if (!screen) return <p>Loading…</p>;
  const fm = screen.frontmatter;
  if (fm.kind !== "decision") return <p>Wrong kind.</p>;

  async function submit(status: "approved"|"revised"|"rejected") {
    await updateDecision(fm.id, status, chosen || undefined, note || undefined);
  }

  return (
    <article>
      <h2>{fm.title}</h2>
      <p><span class={`badge badge-${fm.status}`} /> status: <strong>{fm.status}</strong></p>
      <div class="markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(screen.body) }} />
      <fieldset style={{ marginTop: 16 }}>
        <legend>Options</legend>
        {fm.options.map((o: any) => (
          <label key={o.id} style={{ display: "block", fontWeight: 400 }}>
            <input type="radio" name="opt" value={o.id} checked={chosen === o.id} onChange={() => setChosen(o.id)} /> {o.label}{o.recommended ? " ⭐" : ""}
          </label>
        ))}
      </fieldset>
      <textarea placeholder="Note (required for revise/reject)" value={note} onInput={(e: any) => setNote(e.currentTarget.value)} style={{ marginTop: 8 }} />
      <div class="actions" style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={() => submit("approved")}>Approve</button>
        <button onClick={() => submit("revised")}>Revise</button>
        <button onClick={() => submit("rejected")}>Reject</button>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Wire route**

```tsx
<Route path="/decisions/:id" component={DecisionView} />
```

- [ ] **Step 3: Build and commit**

Run: `bun run --cwd packages/web build`
Expected: clean.

```bash
git add skills/brainstorming/companion/packages/web/src/screens/DecisionView.tsx skills/brainstorming/companion/packages/web/src/app.tsx
git commit -m "$(cat <<'EOF'
feat(companion): decision screen renderer with approve/revise/reject

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 12: Mermaid and Docs Views

### Task 26: Mermaid plugin for markdown-it (lazy)

**Files:**
- Create: `packages/web/src/lib/mermaid.ts`
- Modify: `packages/web/src/lib/markdown.ts`
- Modify: `packages/web/package.json` (add `mermaid`)

- [ ] **Step 1: Add dep**

Append to `packages/web/package.json` dependencies:

```json
"mermaid": "^10.9.0"
```

Run: `cd skills/brainstorming/companion && bun install`.

- [ ] **Step 2: Write `lib/mermaid.ts`**

```typescript
let mermaidPromise: Promise<typeof import("mermaid").default> | undefined;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then(m => {
      m.default.initialize({ startOnLoad: false, theme: "dark" });
      return m.default;
    });
  }
  return mermaidPromise;
}

export async function renderAllMermaidBlocks(root: HTMLElement): Promise<void> {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>("pre > code.language-mermaid"));
  if (blocks.length === 0) return;
  const mermaid = await loadMermaid();
  for (let i = 0; i < blocks.length; i++) {
    const code = blocks[i]!;
    const src = code.textContent ?? "";
    const id = `mmd-${Date.now()}-${i}`;
    const { svg } = await mermaid.render(id, src);
    const host = document.createElement("div");
    host.className = "mermaid-rendered";
    host.innerHTML = svg;
    code.parentElement!.replaceWith(host);
  }
}
```

- [ ] **Step 3: Call it after each markdown render**

Modify `ScreenView.tsx` (and `DemoView`, `DecisionView`) — after the `dangerouslySetInnerHTML` renders, grab the host div via a ref and call `renderAllMermaidBlocks`. Minimal change for `ScreenView`:

```tsx
import { useRef } from "preact/hooks";
import { renderAllMermaidBlocks } from "../lib/mermaid";

// inside the component:
const bodyRef = useRef<HTMLDivElement>(null);
useEffect(() => { if (bodyRef.current) void renderAllMermaidBlocks(bodyRef.current); }, [screen?.frontmatter?.id]);

// replace the body div with:
<div class="markdown" ref={bodyRef} dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
```

Repeat the two-line change in `DemoView.tsx` and `DecisionView.tsx`.

- [ ] **Step 4: Build and commit**

Run: `bun run --cwd packages/web build`
Expected: clean. Mermaid chunk appears in `dist/assets` as a lazy chunk (not in main bundle).

```bash
git add skills/brainstorming/companion/packages/web/src/lib/mermaid.ts skills/brainstorming/companion/packages/web/src/screens skills/brainstorming/companion/packages/web/package.json skills/brainstorming/companion/bun.lockb
git commit -m "$(cat <<'EOF'
feat(companion): lazy mermaid rendering in markdown bodies

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 27: DocsView

**Files:**
- Create: `packages/web/src/screens/DocsView.tsx`
- Modify: `packages/web/src/app.tsx`

- [ ] **Step 1: Write `DocsView.tsx`**

```tsx
import { useEffect, useRef, useState } from "preact/hooks";
import { getDoc } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import { renderAllMermaidBlocks } from "../lib/mermaid";

export function DocsView({ params }: { params: { path: string } }) {
  const [body, setBody] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);
  const decoded = decodeURIComponent(params.path);

  useEffect(() => { void getDoc(decoded).then(setBody); }, [decoded]);
  useEffect(() => { if (ref.current) void renderAllMermaidBlocks(ref.current); }, [body]);

  return (
    <article>
      <h2>{decoded.split("/").pop()}</h2>
      <div class="markdown" ref={ref} dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
    </article>
  );
}
```

- [ ] **Step 2: Wire route (accept path with slashes)**

`preact-iso` supports wildcards via `*`:

```tsx
<Route path="/docs/:path*" component={DocsView} />
```

- [ ] **Step 3: Build and commit**

Run: `bun run --cwd packages/web build`

```bash
git add skills/brainstorming/companion/packages/web/src/screens/DocsView.tsx skills/brainstorming/companion/packages/web/src/app.tsx
git commit -m "$(cat <<'EOF'
feat(companion): DocsView for browsing registered markdown files

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 13: End-to-end integration

### Task 28: Full round-trip integration test

**Files:**
- Create: `packages/server/test/routes.integration.test.ts`

- [ ] **Step 1: Write the test**

```typescript
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("question → answer → decision approve round-trip", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-integration-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try {
    writeFileSync(join(dir, "screens", "q1.md"),
      `---\nkind: question\nid: q1\ntitle: Q\ninputs:\n  - {type: radio, name: t, options: [a, b]}\n---\n`);
    writeFileSync(join(dir, "decisions", "d1.md"),
      `---\nkind: decision\nid: d1\ntitle: D\nstatus: proposed\noptions:\n  - {id: x, label: X}\n  - {id: y, label: Y}\n---\n`);
    await new Promise(r => setTimeout(r, 200));

    // Step 1: list
    expect(await (await fetch(`${ctl.url}/api/screens`)).json()).toHaveLength(1);
    expect(await (await fetch(`${ctl.url}/api/decisions`)).json()).toHaveLength(1);

    // Step 2: answer
    const ar = await fetch(`${ctl.url}/api/answer`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: "q1", client_submission_id: "cs-1", inputs: { t: "a" } }),
    });
    expect(ar.status).toBe(200);

    // Step 3: decision approve
    const dr = await fetch(`${ctl.url}/api/decisions/d1`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved", chosen_option: "x", note: "looks right" }),
    });
    expect(dr.status).toBe(200);

    // Step 4: check events.jsonl
    const lines = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
    expect(lines.find(l => l.type === "answer"   && l.screen_id === "q1")).toBeTruthy();
    expect(lines.find(l => l.type === "decision" && l.id === "d1" && l.status === "approved")).toBeTruthy();

    // Step 5: decision file actually mutated
    expect(readFileSync(join(dir, "decisions", "d1.md"), "utf8")).toContain("status: approved");
  } finally {
    await stopRunning(ctl);
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the integration suite**

Run: `cd skills/brainstorming/companion && bun test`
Expected: all previous tests + this one green. Note any that fail — do not commit until 100% green.

- [ ] **Step 3: Commit**

```bash
git add skills/brainstorming/companion/packages/server/test/routes.integration.test.ts
git commit -m "$(cat <<'EOF'
test(companion): end-to-end question/decision round-trip

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 14: Skill integration and retirement of the old fragment companion

### Task 29: Build and commit `web/dist`

**Files:**
- Modify: `skills/brainstorming/companion/.gitignore` — un-ignore `web/dist`
- Create: `packages/web/dist/**` — built artifacts

- [ ] **Step 1: Un-ignore `web/dist`**

Edit `skills/brainstorming/companion/.gitignore`:

```gitignore
node_modules
.DS_Store
*.log
.bun
tmp-sessions/
!packages/web/dist/
```

- [ ] **Step 2: Production build**

Run: `bun run --cwd packages/web build`
Expected: dist files regenerated.

- [ ] **Step 3: Add and commit**

```bash
git add skills/brainstorming/companion/.gitignore skills/brainstorming/companion/packages/web/dist
git commit -m "$(cat <<'EOF'
chore(companion): commit built web/dist for zero-toolchain runtime

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 30: Update `SKILL.md` and `visual-companion.md`

**Files:**
- Modify: `skills/brainstorming/SKILL.md`
- Modify: `skills/brainstorming/visual-companion.md`
- Create: `skills/brainstorming/companion/docs/screen-format.md` — reference for Claude authoring screens

- [ ] **Step 1: Write `companion/docs/screen-format.md`**

This is the authoritative Claude-facing reference. Copy the three-kind screen format section from the spec verbatim into this file, header:

```markdown
# Screen Format Reference

Claude writes markdown + YAML frontmatter files into `$SESSION_DIR/screens/`. This document is the canonical reference for the schema, copied from the design spec. When writing a screen, always start with the `kind:` field.

[... paste §Screen format from 2026-04-12-visual-companion-mini-ide-design.md verbatim ...]
```

- [ ] **Step 2: Update `SKILL.md` Visual Companion section**

Replace the current Visual Companion section (the one describing the HTML-fragment flow) with a new section that points at `companion/` and documents the Monitor incantation. Keep the "offer consent" paragraph verbatim.

```markdown
## Visual Companion (mini-IDE)

A browser-based companion that renders markdown+YAML screens Claude writes into the session directory. Replaces the legacy fragment-based companion (which has been removed from this fork). Available as a tool — not a mode. Accepting the companion means it's available for questions that benefit from visual treatment; it does NOT mean every question goes through the browser.

**Offering the companion:** When you anticipate that upcoming questions will involve visual content (mockups, layouts, diagrams), offer it once for consent:
> "Some of what we're working on might be easier to explain if I can show it to you in a web browser. I can put together mockups, diagrams, comparisons, and other visuals as we go. Want to try it? (Requires opening a local URL)"

**This offer MUST be its own message.** Do not combine it with clarifying questions, context summaries, or any other content.

### Starting the companion

```bash
bun run skills/brainstorming/companion/packages/server/src/cli.ts start \
  --session-dir /path/to/project/.superpowers/brainstorm/<session> \
  --doc-root /path/to/project/docs \
  --doc-root /path/to/project/specs
```

The server writes `$SESSION_DIR/server-info` and prints a JSON line with `{url, port, pid}`. Tell the user to open the URL.

### Streaming events back into this session

After `companion start`, set up the Monitor once per session:

```
Monitor(
  description: "brainstorming companion events",
  command:     "tail -n 0 -F $SESSION_DIR/events.jsonl | grep --line-buffered -v '^$'",
  persistent:  true,
  timeout_ms:  3600000
)
```

Each JSON line in `events.jsonl` becomes one notification. Silent means free — no tokens while the user reads.

### Writing screens

See `skills/brainstorming/companion/docs/screen-format.md` for the full reference. Three kinds: `question`, `demo`, `decision`. Each is one markdown file with YAML frontmatter under `$SESSION_DIR/screens/`.

### Privacy

Inputs with `private: true` (and all `file-edit` inputs) route through a separate save path that writes directly to the target file and emits only a `saved` event with a sha256 digest — contents never reach Claude through the companion. This does NOT prevent Claude from using its own file-reading tools on the same path; for real secrecy, `.gitignore` it and do not ask Claude to read it.
```

- [ ] **Step 3: Update `visual-companion.md`**

Replace the file contents with a concise redirect:

```markdown
# Visual Companion (mini-IDE)

See `companion/docs/screen-format.md` for the screen format and `SKILL.md` for the start/monitor incantations. The previous HTML-fragment flow is removed; do not reach into `skills/brainstorming/scripts/` — that directory will be deleted in the next commit.
```

- [ ] **Step 4: Commit**

```bash
git add skills/brainstorming/SKILL.md skills/brainstorming/visual-companion.md skills/brainstorming/companion/docs/screen-format.md
git commit -m "$(cat <<'EOF'
docs(companion): update SKILL.md and visual-companion.md for mini-IDE

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 31: Delete the old fragment companion

**Files:**
- Delete: `skills/brainstorming/scripts/*`

- [ ] **Step 1: Verify nothing in the brainstorming skill still references `scripts/`**

Run: `grep -rn "brainstorming/scripts" skills/brainstorming`
Expected: no hits. If any hit remains, fix it and repeat.

- [ ] **Step 2: Delete**

Run:
```bash
git rm -r skills/brainstorming/scripts
```

- [ ] **Step 3: Full test suite once more**

Run: `cd skills/brainstorming/companion && bun test`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(companion): remove legacy fragment companion

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 32: Manual smoke test

**Files:** none

- [ ] **Step 1: Start the companion against a temp session**

Run:
```bash
cd skills/brainstorming/companion
bun run packages/server/src/cli.ts start \
  --session-dir /tmp/companion-smoke \
  --doc-root $(pwd)/docs \
  --foreground &
SERVER_PID=$!
sleep 0.5
PORT=$(jq -r .port /tmp/companion-smoke/server-info)
URL=$(jq -r .url /tmp/companion-smoke/server-info)
echo "URL: $URL"
```

Expected: JSON line printed to stdout; `server-info` contains `{url, port, pid, session_dir}`.

- [ ] **Step 2: Write a question screen and watch it appear**

Run:
```bash
cat > /tmp/companion-smoke/screens/first.md <<'MD'
---
kind: question
id: first
title: Manual smoke
inputs:
  - {type: text, name: note}
---
Does the companion render?
MD

curl -s $URL/api/screens | jq .
```

Expected: a list of length 1 with `id: "first"`.

- [ ] **Step 3: Submit an answer and check events.jsonl**

Run:
```bash
curl -s -X POST $URL/api/answer \
  -H content-type:application/json \
  -d '{"screen_id":"first","client_submission_id":"smoke-1","inputs":{"note":"hi"}}'
tail -n 5 /tmp/companion-smoke/events.jsonl
```

Expected: one `{"type":"answer","inputs":{"note":"hi"},...}` line.

- [ ] **Step 4: Stop**

Run: `kill $SERVER_PID && rm -rf /tmp/companion-smoke`
Expected: clean exit.

- [ ] **Step 5: No commit needed** — this task verifies manually.

---

## Handoff / next steps

After Task 32:

1. Push the branch: `git push -u origin feat/visual-companion-mini-ide`
2. Open an experimental session directory under your real project (`.superpowers/brainstorm/<ts>/`), start the companion, and use the Monitor incantation to wire it into a live brainstorming session.
3. Address the open questions in the spec (inline `html:` in demos, `depends_on` in decisions, embedded help route) as follow-up PRs against this branch or as v1.1 work.

---

## Self-Review Notes

Spec coverage check (spec section → plan task):

- §Architecture layout → Task 1, 2, 4, 17
- §Screen format (question, demo, decision) → Task 2 (schema), 20 (question), 24 (demo), 25 (decision)
- §Event pipeline & Monitor integration → Task 10 (writer), 11 (answer), 15 (decision event), 24 (demo events), §Monitor incantation → Task 30 (SKILL.md)
- §Privacy model → Task 12, 13
- §Frontend structure (three-pane, routes, SSE) → Task 9 (SSE), 17 (scaffold), 18 (client), 19 (sidebar), 20/24/25/27 (views)
- §Session lifecycle → Task 5, 6
- §Error handling (screen_error, save_error, rotation) → Task 7 (screen_error in watcher log), 10 (rotation), 12 (save_error)
- §Testing (unit, integration, privacy property) → Tasks 3, 5, 7, 10, 12, 13, 14, 28
- §Out of scope → respected (no Sandpack, no full Monaco, no Windows polish)

Gaps knowingly left for a follow-up plan:
- `screen_error` events are logged to stderr via `console.error`, not appended to `events.jsonl`. Upgrading the watcher to emit events through the writer is a small follow-up; not load-bearing for v1.
- `--emit-navigate` is parsed but unused; wiring it to the frontend's route-change handler is trivial and can land with navigation polish.
- The shortcut overlay and `j/k` navigation described in the spec are deferred — v1 ships with browser-default keybindings only.
- Windows foreground-mode CLI polish is explicitly out of scope.

Type consistency check: `Screen`, `ScreenFrontmatter`, `Event`, `Decision`, `DecisionStatus` are defined once in `shared/src/` and imported from `@companion/shared` throughout. `RouteCtx` grows monotonically across Chunks 2–6 — each task extends it, never renames fields. Route paths are stable: `/api/screens`, `/api/screens/:id`, `/api/stream`, `/api/answer`, `/api/private-save`, `/api/decisions`, `/api/decisions/:id`, `/api/docs`, `/api/docs/file`, `/api/demo-asset`, `/api/demo-event`.

Placeholder scan: no TBDs, no "implement later", no "similar to task N" — every code step has real code.
