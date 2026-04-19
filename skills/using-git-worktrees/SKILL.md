---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification
---

# Using Git Worktrees

## Overview

Git worktree 立孤立 workspace，共一 repository，使多 branch 同時作而無切換。

**核心原則：** 系統化擇目錄 + 安全驗證 = 可靠孤立。

**開工宣告：** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Directory Selection Process

按此優先序：

### 1. Check Existing Directories

```bash
# Check in priority order
ls -d .worktrees 2>/dev/null     # Preferred (hidden)
ls -d worktrees 2>/dev/null      # Alternative
```

**若見：** 用之。若皆有，`.worktrees` 勝。

### 2. Check CLAUDE.md

```bash
grep -i "worktree.*director" CLAUDE.md 2>/dev/null
```

**若有偏好：** 用之，勿問。

### 3. Ask User

若無目錄、無 CLAUDE.md 偏好：

```
No worktree directory found. Where should I create worktrees?

1. .worktrees/ (project-local, hidden)
2. ~/.config/superpowers/worktrees/<project-name>/ (global location)

Which would you prefer?
```

## Safety Verification

### For Project-Local Directories (.worktrees or worktrees)

**必驗目錄已 ignored 方立 worktree：**

```bash
# Check if directory is ignored (respects local, global, and system gitignore)
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**若未 ignored：**

依 Jesse 之律「Fix broken things immediately」：
1. 加適行於 .gitignore
2. commit 之
3. 續立 worktree

**何以要：** 防 worktree 內容誤 commit 入 repo。

### For Global Directory (~/.config/superpowers/worktrees)

無需驗 .gitignore——全在 project 外。

## Creation Steps

### 1. Detect Project Name

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. Create Worktree

```bash
# Determine full path
case $LOCATION in
  .worktrees|worktrees)
    path="$LOCATION/$BRANCH_NAME"
    ;;
  ~/.config/superpowers/worktrees/*)
    path="~/.config/superpowers/worktrees/$project/$BRANCH_NAME"
    ;;
esac

# Create worktree with new branch
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### 3. Run Project Setup

自動察並跑對應 setup：

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

### 4. Verify Clean Baseline

跑測以確 worktree 起潔：

```bash
# Examples - use project-appropriate command
npm test
cargo test
pytest
go test ./...
```

**若測敗：** 報之，問續否或查。

**若過：** 報備。

### 5. Report Location

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| `.worktrees/` exists | 用之（驗 ignored） |
| `worktrees/` exists | 用之（驗 ignored） |
| Both exist | 用 `.worktrees/` |
| Neither exists | 察 CLAUDE.md → 問 user |
| Directory not ignored | 加 .gitignore + commit |
| Tests fail during baseline | 報敗 + 問 |
| No package.json/Cargo.toml | 跳依賴安裝 |

## Common Mistakes

### 跳 ignore 驗

- **問題：** Worktree 內容被追，污 git status
- **修：** 立 project-local worktree 前必 `git check-ignore`

### 假目錄位

- **問題：** 生不一致、違 project 慣例
- **修：** 依序：既有 > CLAUDE.md > 問

### 測敗而續

- **問題：** 不能辨新 bug 與既疾
- **修：** 報敗，取明允方續

### 硬寫 setup 令

- **問題：** 於異工具 project 上斷
- **修：** 自 project 檔察（package.json 等）

## Example Workflow

```
You: I'm using the using-git-worktrees skill to set up an isolated workspace.

[Check .worktrees/ - exists]
[Verify ignored - git check-ignore confirms .worktrees/ is ignored]
[Create worktree: git worktree add .worktrees/auth -b feature/auth]
[Run npm install]
[Run npm test - 47 passing]

Worktree ready at /Users/jesse/myproject/.worktrees/auth
Tests passing (47 tests, 0 failures)
Ready to implement auth feature
```

## Red Flags

**絕不：**
- 立 worktree 而未驗 ignored（project-local）
- 跳 baseline 測驗
- 測敗而續不問
- 目錄位模糊時假定
- 跳 CLAUDE.md 察

**常：**
- 依序：既有 > CLAUDE.md > 問
- 驗 project-local 目錄已 ignored
- 自察並跑 project setup
- 驗測潔 baseline

## Integration

**Called by：**
- **brainstorming** (Phase 4) - 設計許且 implementation 隨之時必需
- **subagent-driven-development** - 執任務前必需
- **executing-plans** - 執任務前必需
- 任何需孤立 workspace 之 skill

**Pairs with：**
- **finishing-a-development-branch** - 工竟後清理必需