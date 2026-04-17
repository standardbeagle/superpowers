---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

派 superpowers:code-reviewer subagent 以捕疾於級聯前。Reviewer 獲精工之評估 context——勿予汝 session 歷史。此使 reviewer 專注工成品，非汝思路，且保汝 context 以續工。

**核心原則：** 早審，常審。

## When to Request Review

**必需：**
- subagent-driven development 每任務後
- 大功完後
- Merge 入 main 前

**可選而有值：**
- 困時（新視角）
- 重構前（baseline）
- 修複雜 bug 後

## How to Request

**1. 取 git SHAs：**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. 派 code-reviewer subagent：**

用 Task tool 並 superpowers:code-reviewer type，填 `code-reviewer.md` template

**Placeholders：**
- `{WHAT_WAS_IMPLEMENTED}` - 所建
- `{PLAN_OR_REQUIREMENTS}` - 應為
- `{BASE_SHA}` - 起 commit
- `{HEAD_SHA}` - 終 commit
- `{DESCRIPTION}` - 簡摘

**3. 依饋行：**
- Critical 立修
- Important 續前修
- Minor 記待後
- Reviewer 誤則駁（附理）

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch superpowers:code-reviewer subagent]
  WHAT_WAS_IMPLEMENTED: Verification and repair functions for conversation index
  PLAN_OR_REQUIREMENTS: Task 2 from docs/superpowers/plans/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types

[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to Task 3]
```

## Integration with Workflows

**Subagent-Driven Development：**
- 每任務後審
- 於疾疊前捕
- 進次任前修

**Executing Plans：**
- 每 batch（3 任）後審
- 取饋、應之、續

**Ad-Hoc Development：**
- Merge 前審
- 困時審

## Red Flags

**絕不：**
- 因「簡」而跳審
- 忽 Critical
- Important 未修而續
- 與有效技術饋爭

**若 reviewer 誤：**
- 以技術推理駁
- 示可用之碼/測
- 求澄清

See template at: requesting-code-review/code-reviewer.md
