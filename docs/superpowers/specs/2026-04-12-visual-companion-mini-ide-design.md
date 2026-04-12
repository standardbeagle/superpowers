# Visual Companion Mini-IDE

Replace the current HTML-fragment visual companion with a richer local webapp — a mini-IDE for brainstorming that renders question screens, component demos, and design decisions from markdown+YAML files, supports markdown/doc browsing, and streams user activity back to Claude via the Claude Code `Monitor` tool.

Scope: personal fork only. This design deliberately departs from the zero-dependency direction of the current upstream companion and is not intended for upstream contribution.

## Motivation

The current `skills/brainstorming/scripts/` companion is deliberately minimal: a Node.js server with no external deps, serving the newest HTML fragment Claude writes into a session directory. It was refactored to zero-dep in March (see `2026-03-11-zero-dep-brainstorm-server-design.md`) to eliminate supply-chain risk from vendored `node_modules`.

Living with it surfaces three limits that matter in a personal fork:

1. **One screen at a time, no navigation.** The server serves only the newest file. Users cannot flip between earlier screens, see a decision log, or open a doc alongside the current question.
2. **Forms are DIY HTML.** Every form (radios, text, code snippets, file edits) is hand-written HTML per screen. There is no shared widget vocabulary Claude can rely on, and no typed contract for what a "submission" looks like.
3. **Event loop depends on the user typing in the terminal.** Claude only wakes when the user responds in the CLI; a click in the browser is not self-sufficient. This works, but it forces the interaction back through the terminal even when the browser is the natural input surface.

The Monitor tool shipped in Claude Code v2.1.98 (2026-04-09) makes the third limit fixable: a background `tail -F` on an event log streams lines directly into the session as notifications. Combined with a structured screen format, this lets the companion become a real authoring surface without the terminal ping-pong.

### Tradeoff acknowledgement

This design adds a significant dependency footprint (Bun runtime, Vite build, Preact, markdown-it, CodeMirror 6, mermaid, zod, chokidar) on top of a skill whose recent direction has been the opposite. The justification is: (a) fork-only, (b) the new surface area (rich inputs, mermaid, demos, decisions) cannot be built credibly in pure vanilla without recreating a chunk of the ecosystem, (c) the build artifact is committed so end-users do not need a dev toolchain, only the Bun runtime.

## Architecture

A TypeScript monorepo nested inside the brainstorming skill, replacing `scripts/`:

```
skills/brainstorming/companion/
├── package.json              # workspace root
├── packages/
│   ├── server/               # Bun-native CLI + HTTP/event server
│   │   ├── src/cli.ts        # `companion start|stop`
│   │   ├── src/server.ts     # HTTP + file watcher + events writer + SSE
│   │   ├── src/screen.ts     # YAML frontmatter → Screen, zod validation
│   │   ├── src/privacy.ts    # private input writer (never echoes contents)
│   │   └── src/decisions.ts  # decision file read/write with atomic rename
│   └── web/                  # Preact + Vite frontend
│       ├── index.html
│       ├── src/main.tsx      # preact-iso router
│       ├── src/screens/      # ScreenView, DocsView, DecisionView, FilesView
│       ├── src/inputs/       # RadioInput, MultiInput, TextInput, CodeInput, FileEditInput
│       └── src/lib/          # markdown renderer, codemirror setup, api client, mermaid
└── shared/                   # shared types (Screen, Event, InputDef)
```

`web/` builds to `web/dist/` which is committed to the fork. The `server` package imports the built assets from `web/dist/` at runtime, so `bun run companion start` serves everything from one process. No CDNs, no network fetches after startup.

### Runtime stack

- **Runtime**: Bun (required). Native TypeScript, native file watching, built-in test runner, built-in HTTP server, built-in SSE.
- **Frontend**: Preact + preact-iso router (~6KB). Vite build, output in `web/dist/`.
- **Rendering**: `markdown-it` with a mermaid plugin (lazy-loaded), CodeMirror 6 (lazy-loaded, only when a code/file-edit input is present), `unified` for frontmatter parsing.
- **Validation**: `zod` schemas in `shared/` drive both frontend form rendering and server-side validation of incoming screens.

## Screen format

Everything Claude authors is a markdown file with YAML frontmatter. The `kind` field picks the renderer. Three kinds in v1.

### `kind: question`

```markdown
---
kind: question
id: deployment-target
title: Where are we deploying?
inputs:
  - {type: radio,   name: target,   options: [k8s, lambda, desktop]}
  - {type: multi,   name: flags,    options: [ssl, cdn, backups]}
  - {type: text,    name: notes,    multiline: true}
  - {type: code,    name: manifest, language: yaml, placeholder: paste a manifest}
  - {type: file-edit, path: .env,   private: true}
---

## Context

Prose, mermaid diagrams, tables, and images render in the body.
```

Input types in v1:

| type | widget | event value |
|---|---|---|
| `radio` | `<fieldset>` + radios | selected option value |
| `multi` | checkbox group | array of values |
| `text` | `<input>` or `<textarea>` if `multiline: true` | string |
| `code` | CodeMirror 6 with the given `language` | string |
| `file-edit` | CodeMirror 6 bound to a real filesystem path | routes through privacy path; see below |

Any input marked `private: true` routes through the privacy path instead of the public answer path.

### `kind: demo`

```markdown
---
kind: demo
id: login-form-v2
title: Login form — does this feel right?
demo:
  type: srcdoc
  html: ./login.html
  css:  ./login.css
  js:   ./login.js
  viewport: {width: 420, height: 640}
actions:
  - {type: approve, label: Looks good}
  - {type: revise,  label: Needs changes, requires_note: true}
---

## What changed since v1

- …
```

The companion loads the referenced files, inlines them into a sandboxed `<iframe sandbox="allow-scripts">` with no network and no parent access. A tiny `postMessage` bridge lets the demo emit events (e.g. `submitted`, `clicked_signup`) that become `demo_event` entries in `events.jsonl`, so Claude sees what the user did inside the demo, not just that they approved.

v1 supports only `type: srcdoc`. A `type: sandpack` variant for live React/Preact demos is out of scope and can be added later without a format change.

### `kind: decision`

```markdown
---
kind: decision
id: 2026-04-12-auth-strategy
title: Auth strategy for v1
status: proposed          # proposed | approved | revised | rejected
options:
  - {id: magic-link, label: Magic link only, recommended: true}
  - {id: oauth,      label: OAuth (Google, GitHub)}
  - {id: both,       label: Both, gated by env}
---

## Context
...

## Recommendation
Magic link only, because ...

## Tradeoffs
| Option | Pros | Cons |
|--------|------|------|
...
```

Decisions live in `$SESSION_DIR/decisions/` and accumulate across screens. The sidebar has a dedicated Decisions section that renders them with status badges. On user action, the server:

1. Updates the `status:` field in-place via atomic rename (write to `.tmp`, `renameat2`)
2. Appends `{type:"decision", id, status, chosen_option, note, ts}` to `events.jsonl`
3. If revised, leaves the file open so Claude addresses the note in a subsequent turn

Decisions are the authoritative state of the session; the event log is a history stream.

### Mermaid

Fenced mermaid blocks in any markdown body render as SVG client-side via lazy-loaded mermaid ESM. Caching: first mermaid block triggers a one-time ~300KB fetch; subsequent blocks reuse the loaded module.

## Event pipeline & Monitor integration

`$SESSION_DIR/events.jsonl` is append-only, one JSON object per line, never rewritten. Each event has `{ts, type, screen_id, seq, ...}`; `seq` is a monotonic counter the server owns so Claude can detect gaps.

### Event types (v1)

| type | emitted when | payload |
|---|---|---|
| `answer` | question screen submitted | `{inputs: {name: value, ...}}` — excludes any `private:true` input |
| `saved` | private input written | `{name, path, bytes, sha256}` — no contents |
| `demo_event` | srcdoc demo `postMessage` | `{name, data}` as emitted by the demo |
| `decision` | user approves/revises/rejects | `{id, status, chosen_option, note}` |
| `navigate` | sidebar navigation (opt-in) | `{to, from}` |
| `screen_error` | bad YAML or schema mismatch | `{path, message}` |
| `save_error` | private save failed | `{name, path, errno}` |
| `server_ready` | server started | `{url, port, pid}` |
| `server_stopped` | graceful shutdown | `{reason}` |

### Monitor invocation

Claude runs this once per session:

```
Monitor(
  description: "brainstorming companion events",
  command:     "tail -n 0 -F $SESSION_DIR/events.jsonl | grep --line-buffered -v '^$'",
  persistent:  true,
  timeout_ms:  3600000
)
```

- `tail -F` (capital) survives file recreation across server restarts and rotation
- `-n 0` starts at EOF so a resumed session does not flood Claude with replayed events
- `grep --line-buffered` is mandatory; without it events hang in pipe buffers
- Silent means free — no tokens spent while the user is reading
- One line per event = one notification

### Volume caps

Monitor docs warn that monitors producing too many events get auto-stopped. Mitigations:

- `navigate` events are disabled by default; enable per session with `--emit-navigate`
- `demo_event` is rate-limited server-side to 10/sec per screen; the 11th+ collapse into a single `{type:"demo_event_throttled", dropped}`
- Text inputs submit only on form submit, not on keystroke
- `events.jsonl` rotates at 10MB: rename to `events-<ts>.jsonl`, start fresh; `tail -F` follows

## Privacy model

### Invariant

> The process that holds private contents (the Bun server) never writes them into `events.jsonl`, and the process that reads events (Claude, via Monitor) never touches the target file.

### Two write paths

1. **Public** — `/api/answer` parses the body, strips any input whose frontmatter marked `private:true`, appends `{type:"answer", inputs}` to `events.jsonl`.
2. **Private** — `/api/private-save` writes contents directly to the target path with `mode: 0o600`, computes `sha256`, and appends `{type:"saved", name, path, bytes, sha256}` to `events.jsonl`. Contents are never stored anywhere except the target path.

The frontend enforces this split: `FileEditInput` submits through `/api/private-save` only. A unit test asserts that given a screen with `private: true`, no answer payload ever reaches `/api/answer`, and a property test greps `events.jsonl` after a private save and fails if the original contents appear anywhere.

### What the privacy model does not defend against

- Claude can `Read` the file directly via its own file tools — they bypass the companion entirely. Privacy only means "not echoed through the conversation channel". For real secrecy, `.gitignore` and do not ask Claude to read the file.
- `demo_event` payloads from the iframe are fully echoed. Do not put secrets in demos.
- `sha256` in `saved` events reveals whether the same content was used twice. Acceptable for `.env` flows.

## Frontend structure

Three-pane layout:

```
┌──────────────┬─────────────────────────────┬──────────────┐
│  Sidebar     │   Main view                 │  Activity    │
│              │                             │              │
│ Screens      │   /screen/:id               │  Recent      │
│  ○ deploy    │   /docs/*                   │  events      │
│  ● auth      │   /decisions/:id            │  (last 20)   │
│              │   /files/*                  │              │
│ Decisions    │                             │  server      │
│  ✓ 04-12-01  │                             │  status      │
│  ◐ 04-12-02  │                             │              │
│              │                             │              │
│ Docs         │                             │              │
│  README.md   │                             │              │
│  specs/...   │                             │              │
└──────────────┴─────────────────────────────┴──────────────┘
```

**Routing**: `preact-iso`. Four top-level routes: `/screen/:id`, `/docs/*`, `/decisions/:id`, `/files/*`. Browser back/forward works naturally.

**Sidebar sources**:

- **Screens** — `GET /api/screens` → `{id, title, kind, status}[]`; newest marked *current*; `pinned: true` in frontmatter anchors items
- **Decisions** — `GET /api/decisions` → reads `$SESSION_DIR/decisions/*.md` frontmatter only; status badges
- **Docs** — `GET /api/docs` → lists files under directories registered at startup with `--doc-root <path>` (repeatable); read-only markdown view

**Live updates**: `GET /api/stream` is a Server-Sent Events endpoint. On screen/decision file changes, the server pushes `{type:"refresh", kind, id}` to every connected browser so sidebars and views re-render without polling.

**Header bar**: session name, connection dot, "Copy URL" button, collapse-sidebar button, shortcuts hint.

**Keyboard**: `j/k` move within current sidebar section, `g s` / `g d` / `g k` jump between Screens/Docs/Decisions, `/` focuses a fuzzy filter, `?` opens a shortcuts overlay. No shortcut hijacks default browser keys.

**Accessibility**: real `<input>`/`<textarea>`/`<button>`, real `<fieldset>` for radio groups, visible focus rings, CodeMirror's built-in a11y story accepted as-is.

## Session lifecycle

1. `companion start --session-dir <path> [--doc-root ...] [--emit-navigate] [--foreground] [--host] [--port] [--url-host]`
2. CLI ensures `$SESSION_DIR/{screens,decisions,events.jsonl,server-info}` exist, starts the Bun server, writes `server-info` with `{url, port, pid}`, prints the same JSON to stdout, forks to background by default
3. Idle timeout: if no HTTP requests and no screen-file changes for 30 minutes, the server writes `server-stopped` and exits cleanly. Claude re-runs `companion start` on next need.
4. `companion stop --session-dir <path>` sends SIGTERM; graceful shutdown flushes pending writes.
5. Multi-session: each session picks an ephemeral port; `--session-dir` is the only required identity. Two concurrent sessions work because all state is session-local.

## Error handling

| Failure | Behavior |
|---|---|
| Malformed YAML in a screen file | Skip the screen, emit `screen_error`, show an error card in the sidebar |
| Private save fails (perm, disk full) | Return 5xx, emit `save_error`, frontend surfaces inline; the answer is NOT recorded |
| Demo iframe throws | Sandbox catches via `onerror`, emits `demo_event {name:"__error", data:{message, stack}}` |
| Browser disconnect mid-answer | Server is idempotent per `{screen_id, client_submission_id}` |
| Watcher misses event (macOS FS quirks) | Falls back to 1s polling after 5 missed renames |
| Port in use | CLI retries port+1 up to 10 times, then errors |
| `events.jsonl` grows unbounded | Rotates at 10MB; `tail -F` follows the new file |

## Testing

- **Unit** (Bun test): `screen.ts` (YAML + zod validation, private-input filtering), `privacy.ts` (property: contents never appear in events.jsonl), `decisions.ts` (atomic status update).
- **Integration** (Bun test): spin up the server against a temp session dir, drive it with `fetch` — POST answers, read `events.jsonl`, assert event shape. No browser.
- **End-to-end** (Playwright, local only): open URL, fill form, submit, assert event arrives. Run before releases, not in CI.
- **Privacy regression test is load-bearing**: any change to `privacy.ts` or `/api/answer` must keep the "no .env contents in any event" property test green.

## Out of scope for v1

- Sandpack / esbuild-wasm live React demos (srcdoc only)
- Multi-user, remote access, auth
- Persistent history across sessions (session dir is the unit of persistence)
- Full Monaco editor (CodeMirror 6 only)
- Plan/task integration with `writing-plans` skill (v2)
- Windows-specific foreground polish beyond "it runs if you `--foreground`"

## Open questions

1. Should `demo` support inline `html:` strings in the frontmatter as a shortcut instead of always referencing a file? (Probably yes — it makes single-file one-off demos easier for Claude to write.)
2. Should decisions support `depends_on: [other-id]` so the sidebar can render a DAG? (Probably not in v1 — flat list is fine; revisit if the decisions log gets long in practice.)
3. Should the companion embed the superpowers `visual-companion.md` guide as an in-app help route? (Probably yes, low-effort, nice touch.)
