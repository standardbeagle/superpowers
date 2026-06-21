---
name: interactive-companion
description: "Use when an HTML UI beats terminal text — collecting structured answers (decision trees, multi-select, code/SQL fields), showing visual comparisons or mockups, running interactive demos, or presenting decisions for approval. A local browser companion renders markdown+YAML screens and streams the user's answers back. Use when: many questions at once, layout/visual choices, mockup or diagram feedback, config wizard, demo review, approve/revise decisions. Skip: a single quick question (use AskUserQuestion or plain text)."
---

# Interactive Companion (browser mini-IDE)

A local browser-based companion that renders markdown+YAML **screens** you write to a session
directory and streams the user's answers back as JSON events. Reach for it whenever a web UI is a
better interface than terminal text — and fall back to terminal text when it isn't.

This is a reusable tool. `brainstorming` is one consumer (high-bandwidth design intake); any
workflow can drive it — research intake, config wizards, demo review, multi-question forms,
approve/revise gates.

## When HTML beats terminal text (use the companion)

- **Many questions at once** — decision trees, multi-selects, branch-revealed follow-ups the user
  fills in one sitting instead of a back-and-forth chat.
- **Visual / layout choices** — mockups, diagrams (mermaid), side-by-side comparisons.
- **Structured / typed input** — code or SQL fields (CodeMirror), file edits.
- **Live demos** — sandboxed HTML the user interacts with; their clicks stream back as events.
- **Decisions for approval** — proposed/approved/revised/rejected with persistent status.

## When terminal text is better (skip the companion)

- A single quick question → `AskUserQuestion` or plain text.
- The user declined the local URL, or no browser is available.
- A yes/no that gates everything else and needs no visual.

**Offer once, get consent** (it opens a local URL):
> "I'd like to put this in a small web form / mockup so it's easier than going back and forth in
> the terminal — it can show diagrams, comparisons, and collect everything at once. Want to try it?
> (Requires opening a local URL)"

Make the offer its own message. If declined, fall back to `AskUserQuestion` / text.

## Starting the companion

```bash
bun run ${CLAUDE_PLUGIN_ROOT}/skills/interactive-companion/companion/packages/server/src/cli.ts start \
  --session-dir /path/to/project/.superpowers/companion/<session> \
  --doc-root /path/to/project/docs \
  --doc-root /path/to/project/specs
```

Server writes `$SESSION_DIR/server-info` and prints one JSON line with `{url, port, pid}`. Give the
user the URL. (Run via `exec` / a detached process so it survives — it's a long-running server.)

## Streaming answers back into this session

After start, set a Monitor once per session so answers surface as they land:

```
Monitor(
  description: "interactive companion answers",
  command:     "tail -n 0 -F $SESSION_DIR/events.jsonl | grep --line-buffered -v '^$'",
  persistent:  true,
  timeout_ms:  3600000
)
```

Each line in `events.jsonl` is one notification. Silence costs nothing — no tokens burned while the
user reads/fills. Answers and submitted state persist server-side, so the user can navigate between
screens and reload without losing input (answered screens show a green dot).

**Process answers as they stream** — don't block on the full set. When one screen's answer lands,
act on it (draft, look something up, dispatch a subagent) while the user fills the rest.

## Writing screens

See `companion/docs/screen-format.md` for the full reference. Each screen is a markdown file with
YAML frontmatter under `$SESSION_DIR/screens/` (decisions under `$SESSION_DIR/decisions/`). Three
kinds:

- **`question`** — inputs: `radio`, `multi`, `text` (multiline), `code` (language), `file-edit`.
  Render prose, tables, images, and mermaid in the body. Add a free-text "anything else" field to
  catch what the options missed.
- **`demo`** — sandboxed HTML/CSS/JS in an iframe; the user's interactions stream back as
  `demo_event`s, so you see what they did, not just whether they approved.
- **`decision`** — options with `recommended: true`, a status (`proposed`→`approved`/`revised`/
  `rejected`) that persists and shows a status badge. Use for approval gates.

## Privacy

Inputs marked `private: true` (and all `file-edit` inputs) take a separate save path — written
straight to the target file, emitting only a `saved` event with a sha256 digest; contents never
reach Claude through the companion channel. This does **not** stop Claude reading the same path with
its own file tools — for true secrets, `.gitignore` the file and don't ask Claude to read it.

## Setup

The companion is a bun project under `companion/`. First use needs `bun install` in that directory.
All paths inside the server are self-contained relative to `companion/`, so the whole folder is
portable.
