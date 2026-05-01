---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

書周全實作計劃，假 engineer 於 codebase 無 context 且品味可疑。錄其所需：每任應觸何檔、測碼、impl 介面、acceptance、如何測。予全計以小任，貴密貴準。DRY. YAGNI. TDD. 頻 commit.

假其熟 dev，然幾不知汝 toolset 或 problem domain。假其不甚善測計。

**開工宣告：** "I'm using the writing-plans skill to create the implementation plan."

**Context：** 宜於獨 worktree 中執（由 brainstorming skill 造）。

**存計劃於：** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- (User preferences for plan location override this default)

## Scope Check

若 spec 涵多獨立子系統，應於 brainstorming 時拆為子 project spec。若未拆，建議拆為獨計——每子系統一。每計應自生可用可測之軟。

## Vertical Slicing（必行）

每任為 vertical slice：自 user-visible 入口至底層存儲全通，雖 anemic（少特性、無 UI 飾、邊例略）亦可。**禁** horizontal layer 任（先全 model、後全 route、後全 view）。判據：任畢後 user 可體驗一行為終始。若不能，重分。

## Algorithmic Performance Gate（必行）

計寫畢前，列 hot path（每 request / 事件 / loop iter 執之碼）。每 hot path 注：
- 輸入規模（bounded? unbounded?）
- 複雜度（O(?)）
- I/O 模式（N+1? batched? streaming?）

紅旗——遇即重設計，**不**入計：
- O(n²)+ 於 unbounded n
- N+1 query 於 request hot path
- sync I/O 於 loop
- unbounded memory growth
- 每請求重算可 cache 之常量

非 hot path 略。MVP 期 acceptable trade-off 注明於任。

## File Structure

定任前，列所造/改之檔及各責何。此即分解決之所鎖。

- 設計單元有明界與明介面。每檔一明責。
- 偏小專檔勝大而雜者。同變之檔同居（按責分，非按 layer）。
- 既 codebase 循既式。若改之檔已臃，計中含拆理。

## TDD Ritual（一次定，諸任引）

每 `tdd` 標任默含五步，計中**勿**重列：

1. 寫測（測碼如任所示）
2. 執測 → 期 fail（fail reason 如任所示）
3. 寫 impl（簽名 + acceptance 如任所示，executor 自填體）
4. 執測 → 期 pass
5. Commit（msg 如任所示）

任中只列每步**獨**內容（測碼、fail reason、簽名、acceptance、commit msg）。樣板勿重抄。

## Plan Document Header

**每計必以此 header 起：**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development（建議）或 superpowers:executing-plans。Steps 用 `- [ ]` checkbox。每 `tdd`-標任默 5-step ritual 見 writing-plans skill — 計中勿重抄。

**Goal:** [One sentence]

**Architecture:** [2-3 sentences]

**Tech Stack:** [Key libs]

**Spec:** `path/to/spec.md#anchor` — 計勿重述 spec，引之。

**Hot Paths（perf gate）：**
- `<call site>` — input: bounded N≤1k / unbounded — O(?) — I/O: ?
- ...

**File Map：**
- `path/a` — 責: ...
- `path/b` — 責: ...

---
```

## Task Structure（KDL frontmatter + contract）

每任以 KDL block 起，後接測碼 + 簽名 + acceptance。**禁** Step 1..5 樣板重抄。

````markdown
### Task N: [Component Name]

```kdl
task n=N name="auth-token-verify" {
  slice "user 攜 expired token 受 401 — 終始"
  files {
    create "src/auth/verify.ts"
    modify "src/middleware.ts:120-145"
    test "tests/auth/verify.test.ts"
  }
  signature "verify(token: string): Result<Claims, AuthError>"
  acceptance "expired → Err(Expired); malformed → Err(Malformed); valid → Ok(claims)"
  test-cmd "pnpm test verify"
  fail-reason "verify undefined"
  commit-msg "feat(auth): add token verify"
  perf "O(1) JWT decode + 簽名校；無 DB on hot path"
  tdd
}
```

**Test（完碼，executor 照抄）：**

```ts
import { verify } from '../src/auth/verify';
test('expired token → Err(Expired)', () => {
  expect(verify(EXPIRED_FIXTURE)).toEqual({ ok: false, err: 'Expired' });
});
```

**Signature（executor 自填體 to satisfy test）：**

```ts
export function verify(token: string): Result<Claims, AuthError>;
```
````

executor 規約：見 `tdd` 即跑 5-step ritual，引 frontmatter 各欄。impl 體**不**入計——test + signature + acceptance 為 contract。impl 重於計者（algo、tricky data shape）顯式列 impl block。

## No Placeholders

每任必含 executor 所需實內容。皆**計劃失敗**——絕不書：
- "TBD"、"TODO"、"implement later"、"fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above"（無實測碼）
- "Similar to Task N"（重碼——executor 或亂序讀任）
- 述何為而不示如何之步（碼步必有 code block）
- 指未於任中定之型、函、方

例外：impl 體**可**省（test + signature + acceptance 為 contract）。但測碼、簽名、acceptance 必全。

## Remember
- 常用確切 file path
- 測碼必全；impl 簽名 + acceptance 必明
- 確令與期望輸出
- 引 spec by anchor，勿重述
- DRY、YAGNI、TDD、頻 commit
- vertical slice + perf gate 必行

## Self-Review

計寫畢後，以新眼察 spec 並核計。此乃自執 checklist——非派 subagent。

1. **Spec coverage** — 略每節/需。可指任實之否？列缺。
2. **Vertical slice check** — 每任終 user-visible 行為否？horizontal-layer 任重分。
3. **Perf gate** — hot paths 列且無紅旗否？有紅旗重設計。
4. **Placeholder scan** — 上「No Placeholders」紅旗，修之。
5. **Type consistency** — 後任用之型、方簽、屬名配先任所定否？Task 3 `clearLayers()` vs Task 7 `clearFullLayers()` 即 bug。
6. **DRY check** — TDD 5-step 樣板重抄否？KDL frontmatter 用否？引而勿重抄。

若見疾，inline 修。修即進。若見 spec 需而無任，加任。

## Execution Handoff

存計後，提執行擇：

**"Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?"**

**若擇 Subagent-Driven：**
- **必需 SUB-SKILL：** superpowers:subagent-driven-development
- 每任新 subagent + 二段審

**若擇 Inline Execution：**
- **必需 SUB-SKILL：** superpowers:executing-plans
- Batch execution with checkpoints for review
