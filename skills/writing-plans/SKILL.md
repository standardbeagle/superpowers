---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

書周全實作計劃，假 engineer 於 codebase 無 context 且品味可疑。錄其所需：每任應觸何檔、碼、測、應察之 doc、如何測。予全計以小任。DRY. YAGNI. TDD. 頻 commit.

假其為熟 dev，然幾不知汝 toolset 或 problem domain。假其不甚善測計。

**開工宣告：** "I'm using the writing-plans skill to create the implementation plan."

**Context：** 宜於獨 worktree 中執（由 brainstorming skill 造）。

**存計劃於：** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- (User preferences for plan location override this default)

## Scope Check

若 spec 涵多獨立子系統，應於 brainstorming 時拆為子 project spec。若未拆，建議拆為獨計——每子系統一。每計應自生可用可測之軟。

## File Structure

定任前，列所造/改之檔及各責何。此即分解決之所鎖。

- 設計單元有明界與明介面。每檔一明責。
- 汝最善推理於可一時持於 context 之碼，編小專檔更可靠。偏小專檔勝大而雜者。
- 同變之檔同居。按責分，非按 layer。
- 於既 codebase，循既式。若既用大檔，勿擅重構——然若汝改之檔已臃，計劃中含拆理。

此結構引任分解。每任應生獨可存之變。

## Bite-Sized Task Granularity

**每步一行動（2-5 min）：**
- "Write the failing test" - 一步
- "Run it to make sure it fails" - 一步
- "Implement the minimal code to make the test pass" - 一步
- "Run the tests and make sure they pass" - 一步
- "Commit" - 一步

## Plan Document Header

**每計必以此 header 起：**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## No Placeholders

每步必含 engineer 所需實內容。皆為**計劃失敗**——絕不書：
- "TBD"、"TODO"、"implement later"、"fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above"（無實測碼）
- "Similar to Task N"（重碼——engineer 或亂序讀任）
- 述何為而不示如何之步（碼步必有 code block）
- 指未於任中定之型、函、方

## Remember
- 常用確切 file path
- 每步含完碼——若變碼，示碼
- 確令與期望輸出
- DRY、YAGNI、TDD、頻 commit

## Self-Review

計寫畢後，以新眼察 spec 並核計。此乃自執 checklist——非派 subagent。

**1. Spec coverage：** 略每節/需。可指任實之否？列缺。

**2. Placeholder scan：** 察計中紅旗——上「No Placeholders」諸式。修之。

**3. Type consistency：** 後任用之型、方簽、屬名，配先任所定否？ Task 3 之 `clearLayers()` 而 Task 7 之 `clearFullLayers()` 即 bug。

若見疾，inline 修。無需再審——修即進。若見 spec 需而無任，加任。

## Execution Handoff

存計後，提執行擇：

**"Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?"**

**若擇 Subagent-Driven：**
- **必需 SUB-SKILL：** 用 superpowers:subagent-driven-development
- 每任新 subagent + 二段審

**若擇 Inline Execution：**
- **必需 SUB-SKILL：** 用 superpowers:executing-plans
- Batch execution with checkpoints for review