---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
---

# Finishing a Development Branch

## Overview

引 development 竟工，列明選，處所擇流程。

**核心原則：** 驗測 → 列選 → 執擇 → 清理。

**開工宣告：** "I'm using the finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Tests

**列選前，驗測過：**

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**若測敗：**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

止。勿進 Step 2。

**若測過：** 進 Step 2。

### Step 2: Determine Base Branch

```bash
# Try common base branches
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

或問："This branch split from main - is that correct?"

### Step 3: Present Options

列此 4 選：

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**勿加釋** — 選要簡。

### Step 4: Execute Choice

#### Option 1: Merge Locally

```bash
# Switch to base branch
git checkout <base-branch>

# Pull latest
git pull

# Merge feature branch
git merge <feature-branch>

# Verify tests on merged result
<test command>

# If tests pass
git branch -d <feature-branch>
```

後：清理 worktree（Step 5）

#### Option 2: Push and Create PR

```bash
# Push branch
git push -u origin <feature-branch>

# Create PR
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

後：清理 worktree（Step 5）

#### Option 3: Keep As-Is

報："Keeping branch <name>. Worktree preserved at <path>."

**勿清 worktree。**

#### Option 4: Discard

**先確認：**
```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

待確切確認。

若確：
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

後：清理 worktree（Step 5）

### Step 5: Cleanup Worktree

**於 Options 1, 2, 4：**

察是否於 worktree：
```bash
git worktree list | grep $(git branch --show-current)
```

若是：
```bash
git worktree remove <worktree-path>
```

**於 Option 3：** 留 worktree。

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | ✓ | - | - | ✓ |
| 2. Create PR | - | ✓ | ✓ | - |
| 3. Keep as-is | - | - | ✓ | - |
| 4. Discard | - | - | - | ✓ (force) |

## Common Mistakes

**跳測驗**
- **問題：** Merge 斷碼、造敗 PR
- **修：** 列選前必驗測

**開放式問**
- **問題：** "What should I do next?" → 歧
- **修：** 列確切 4 選

**自動清 worktree**
- **問題：** 移或仍需之 worktree（Option 2, 3）
- **修：** 僅 Options 1, 4 清

**無確認即毀**
- **問題：** 誤刪工
- **修：** Option 4 須打字 "discard"

## Red Flags

**絕不：**
- 測敗而續
- 未驗 merge 結果測即 merge
- 無確認即刪
- 無明請即 force-push

**常：**
- 列選前驗測
- 列確切 4 選
- Option 4 取打字確認
- 僅 Options 1 & 4 清 worktree

## Integration

**Called by：**
- **subagent-driven-development** (Step 7) - 所有任務畢後
- **executing-plans** (Step 5) - 所有 batch 畢後

**Pairs with：**
- **using-git-worktrees** - 清由此 skill 立之 worktree