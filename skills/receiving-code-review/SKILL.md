---
name: receiving-code-review
description: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation
---

# Code Review Reception

## Overview

Code review 需技術評估，非情感展演。

**核心原則：** 實作前驗。假設前問。技術正確勝社交安逸。

## The Response Pattern

```
WHEN receiving code review feedback:

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in own words (or ask)
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each
```

## Forbidden Responses

**絕不：**
- "You're absolutely right!"（明違 CLAUDE.md）
- "Great point!" / "Excellent feedback!"（展演）
- "Let me implement that now"（驗前）

**代之：**
- 重述技術要求
- 問澄清
- 以技術推理駁誤
- 即動手（行動勝言）

## Handling Unclear Feedback

```
IF any item is unclear:
  STOP - do not implement anything yet
  ASK for clarification on unclear items

WHY: Items may be related. Partial understanding = wrong implementation.
```

**例：**
```
your human partner: "Fix 1-6"
You understand 1,2,3,6. Unclear on 4,5.

❌ WRONG: Implement 1,2,3,6 now, ask about 4,5 later
✅ RIGHT: "I understand items 1,2,3,6. Need clarification on 4 and 5 before proceeding."
```

## Source-Specific Handling

### From your human partner
- **可信** — 明後實作
- **仍問** 若範圍模糊
- **無展演之同意**
- **直行動** 或技術確認

### From External Reviewers
```
BEFORE implementing:
  1. Check: Technically correct for THIS codebase?
  2. Check: Breaks existing functionality?
  3. Check: Reason for current implementation?
  4. Check: Works on all platforms/versions?
  5. Check: Does reviewer understand full context?

IF suggestion seems wrong:
  Push back with technical reasoning

IF can't easily verify:
  Say so: "I can't verify this without [X]. Should I [investigate/ask/proceed]?"

IF conflicts with your human partner's prior decisions:
  Stop and discuss with your human partner first
```

**your human partner's rule：** "External feedback - be skeptical, but check carefully"

## YAGNI Check for "Professional" Features

```
IF reviewer suggests "implementing properly":
  grep codebase for actual usage

  IF unused: "This endpoint isn't called. Remove it (YAGNI)?"
  IF used: Then implement properly
```

**your human partner's rule：** "You and reviewer both report to me. If we don't need this feature, don't add it."

## Implementation Order

```
FOR multi-item feedback:
  1. Clarify anything unclear FIRST
  2. Then implement in this order:
     - Blocking issues (breaks, security)
     - Simple fixes (typos, imports)
     - Complex fixes (refactoring, logic)
  3. Test each fix individually
  4. Verify no regressions
```

## When To Push Back

駁之時：
- 建議破既功
- Reviewer 缺全 context
- 違 YAGNI（未用之功）
- 於此 stack 技術誤
- 有 legacy/相容因
- 衝 your human partner 架構決

**如何駁：**
- 用技術推理，非防衛
- 問具體問
- 指可用之測/碼
- 若關架構，邀 your human partner

**若難開口駁：** "Strange things are afoot at the Circle K"

## Acknowledging Correct Feedback

正確時：
```
✅ "Fixed. [Brief description of what changed]"
✅ "Good catch - [specific issue]. Fixed in [location]."
✅ [Just fix it and show in the code]

❌ "You're absolutely right!"
❌ "Great point!"
❌ "Thanks for catching that!"
❌ "Thanks for [anything]"
❌ ANY gratitude expression
```

**何以無謝：** 行動勝言。修之。碼本身示汝已聞。

**若察將書「Thanks」：** 刪之。代以修之述。

## Gracefully Correcting Your Pushback

汝駁而誤：
```
✅ "You were right - I checked [X] and it does [Y]. Implementing now."
✅ "Verified this and you're correct. My initial understanding was wrong because [reason]. Fixing."

❌ Long apology
❌ Defending why you pushed back
❌ Over-explaining
```

據實述修而進。

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| 展演之同意 | 述要求或直行動 |
| 盲實作 | 先驗於 codebase |
| 不測而批量 | 一次一，每測 |
| 假 reviewer 對 | 察是否破 |
| 避駁 | 技術正確 > 安逸 |
| 部分實作 | 先澄清所有 |
| 不能驗而續 | 述限，求向 |

## Real Examples

**展演同意（Bad）：**
```
Reviewer: "Remove legacy code"
❌ "You're absolutely right! Let me remove that..."
```

**技術驗證（Good）：**
```
Reviewer: "Remove legacy code"
✅ "Checking... build target is 10.15+, this API needs 13+. Need legacy for backward compat. Current impl has wrong bundle ID - fix it or drop pre-13 support?"
```

**YAGNI（Good）：**
```
Reviewer: "Implement proper metrics tracking with database, date filters, CSV export"
✅ "Grepped codebase - nothing calls this endpoint. Remove it (YAGNI)? Or is there usage I'm missing?"
```

**Unclear Item（Good）：**
```
your human partner: "Fix items 1-6"
You understand 1,2,3,6. Unclear on 4,5.
✅ "Understand 1,2,3,6. Need clarification on 4 and 5 before implementing."
```

## GitHub Thread Replies

答 inline review comment 於 GitHub 時，於 comment thread 中答（`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`），勿作頂層 PR comment。

## The Bottom Line

**External feedback = suggestions to evaluate, not orders to follow.**

驗之。問之。方實作。

無展演之同意。技術嚴謹恆常。