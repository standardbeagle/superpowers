# Screen Format Reference

Claude 以 markdown 合 YAML frontmatter 書寫諸檔，納入 `$SESSION_DIR/screens/`。本文乃 schema 之正典參照。書寫 screen 之際，當以 `kind:` 欄位為首。

## Screen 格式

凡 Claude 所著，皆為 markdown 檔，附 YAML frontmatter。`kind` 欄位擇定 renderer。v1 有三類。

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

v1 Input 類型：

| type | widget | event value |
|---|---|---|
| `radio` | `<fieldset>` + radios | selected option value |
| `multi` | checkbox group | array of values |
| `text` | `<input>` or `<textarea>` if `multiline: true` | string |
| `code` | CodeMirror 6 with the given `language` | string |
| `file-edit` | CodeMirror 6 bound to a real filesystem path | routes through privacy path; see below |

凡 input 標註 `private: true` 者，皆經 privacy path，而不循 public answer path。

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

Companion 載入所引諸檔，內聯於 sandboxed `<iframe sandbox="allow-scripts">`，禁絕 network 與 parent access。微型 `postMessage` bridge 令 demo 發射 events（如 `submitted`, `clicked_signup`），化為 `events.jsonl` 內之 `demo_event` 條目，Claude 乃得見用戶於 demo 內之所為，非僅知其 approved 與否。

v1 唯支援 `type: srcdoc`。`type: sandpack` 之變體，為 live React/Preact demo 而設，暫屬 out of scope，日後可增之而無需變更格式。

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

Decisions 存於 `$SESSION_DIR/decisions/`，累積於諸 screen 之間。Sidebar 設專屬 Decisions 區，以 status badge 渲染之。用戶行事之際，server 乃：

1. 以 atomic rename（先書 `.tmp`，後以 `renameat2`）就地更新 `status:` 欄位
2. 將 `{type:"decision", id, status, chosen_option, note, ts}` 附加於 `events.jsonl`
3. 若 status 為 revised，則留檔開啟，Claude 於後續 turn 中處理其 note

Decisions 乃 session 之權威狀態；event log 則為 history stream。

### Mermaid

凡 markdown body 內之 fenced mermaid block，皆於 client-side 渲染為 SVG，藉 lazy-loaded mermaid ESM 實現。Caching 之道：首見 mermaid block 則觸發一次性 ~300KB fetch；後續諸 block 復用已載之 module。

## Privacy model

### Invariant

> 握 private contents 之 process（Bun server）永不將其寫入 `events.jsonl`，而讀取 events 之 process（Claude，經由 Monitor）永不觸及 target file。

### Two write paths

1. **Public** — `/api/answer` 解析 body，剝離 frontmatter 標註 `private:true` 之 input，將 `{type:"answer", inputs}` 附加於 `events.jsonl`。
2. **Private** — `/api/private-save` 逕直將 contents 寫入 target path，以 `mode: 0o600` 權限之，計算 `sha256`，並將 `{type:"saved", name, path, bytes, sha256}` 附加於 `events.jsonl`。Contents 除 target path 外，不存於任何地方。

Frontend 強制此分離：`FileEditInput` 唯經 `/api/private-save` 提交。Unit test 斷言：設 screen 有 `private: true`，則 answer payload 永不達 `/api/answer`；property test 於 private save 後 grep `events.jsonl`，若原始 contents 出現於任何處，則判為失敗。

### Privacy model 所不能禦者

- Claude 得以其自備 file tools 逕直 `Read` 檔案——此乃 bypass companion 之道。Privacy 唯謂「不經 conversation channel 迴響」。求真 secrecy，當以 `.gitignore` 處之，且勿令 Claude 讀取該檔。
- iframe 發出之 `demo_event` payload 盡數迴響。勿以 secrets 置於 demo 之中。
- `saved` events 內之 `sha256` 洩露同一內容是否復用。此於 `.env` flows 中可接受。
