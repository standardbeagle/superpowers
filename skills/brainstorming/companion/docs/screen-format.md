# Screen Format Reference

Claude writes markdown + YAML frontmatter files into `$SESSION_DIR/screens/`. This document is the canonical reference for the schema. When writing a screen, always start with the `kind:` field.

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
