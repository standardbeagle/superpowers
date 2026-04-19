---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
---

# Executing Plans

## Overview

載計劃，嚴審，執所有任，竟後報。

**開工宣告：** "I'm using the executing-plans skill to implement this plan."

**Note：** 告 your human partner：Superpowers 用 subagent 時果佳。若 platform 支 subagent（如 Claude Code 或 Codex），用 superpowers:subagent-driven-development 代此 skill。

## The Process

### Step 1: Load and Review Plan
1. 讀計劃檔
2. 嚴審——辨問題或關切
3. 若有疑：先與 your human partner 議再開工
4. 若無：立 TodoWrite 並續

### Step 2: Execute Tasks

每任務：
1. 標 in_progress
2. 逐步確執（計劃有小步）
3. 按規跑驗證
4. 標 completed

### Step 3: Complete Development

所有任畢且驗後：
- 宣告："I'm using the finishing-a-development-branch skill to complete this work."
- **必需 SUB-SKILL：** 用 superpowers:finishing-a-development-branch
- 依之驗測、列選、執擇

## When to Stop and Ask for Help

**立止執行於：**
- 遇阻（缺依賴、測敗、指令不清）
- 計劃有關鍵缺致無法起
- 不明指令
- 驗屢敗

**求澄清勝猜。**

## When to Revisit Earlier Steps

**返 Review（Step 1）於：**
- Partner 依汝饋更計
- 根本法需重思

**勿強穿阻** — 止而問。

## Remember
- 先嚴審計劃
- 逐步遵
- 勿跳驗證
- 計劃指引 skill 時用之
- 阻時止，勿猜
- 絕不於 main/master 開工而無 user 明允

## Integration

**所需 workflow skills：**
- **superpowers:using-git-worktrees** - 必需：開工前立孤立 workspace
- **superpowers:writing-plans** - 造此 skill 執行之計劃
- **superpowers:finishing-a-development-branch** - 所有任畢後竟 development