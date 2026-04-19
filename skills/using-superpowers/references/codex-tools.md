# Codex Tool Mapping

Skills 以 Claude Code tool names 為準。遇之於 skill 中，當以 platform equivalent 替之：

| Skill references | Codex equivalent |
|-----------------|------------------|
| `Task` tool (dispatch subagent) | `spawn_agent` (see [Named agent dispatch](#named-agent-dispatch)) |
| Multiple `Task` calls (parallel) | Multiple `spawn_agent` calls |
| Task returns result | `wait` |
| Task completes automatically | `close_agent` to free slot |
| `TodoWrite` (task tracking) | `update_plan` |
| `Skill` tool (invoke a skill) | Skills load natively — just follow the instructions |
| `Read`, `Write`, `Edit` (files) | Use your native file tools |
| `Bash` (run commands) | Use your native shell tools |

## Subagent dispatch requires multi-agent support

Codex config (`~/.codex/config.toml`) 中添加：

```toml
[features]
multi_agent = true
```

此舉啟用 `spawn_agent`, `wait`, `close_agent`，以供 `dispatching-parallel-agents` 及 `subagent-driven-development` 諸 skill 之用。

## Named agent dispatch

Claude Code skills 引用 named agent types，如 `superpowers:code-reviewer`。
Codex 無 named agent registry — `spawn_agent` 自 built-in roles (`default`, `explorer`, `worker`) 創建 generic agents。

Skill 謂 dispatch named agent type 時：

1. 尋 agent prompt file（如 `agents/code-reviewer.md` 或 skill 本地之 prompt template，如 `code-quality-reviewer-prompt.md`）
2. 讀 prompt content
3. 填 template placeholders（`{BASE_SHA}`, `{WHAT_WAS_IMPLEMENTED}`, 等）
4. Spawn `worker` agent，以填畢之 content 為 `message`

| Skill instruction | Codex equivalent |
|-------------------|------------------|
| `Task tool (superpowers:code-reviewer)` | `spawn_agent(agent_type="worker", message=...)` with `code-reviewer.md` content |
| `Task tool (general-purpose)` with inline prompt | `spawn_agent(message=...)` with the same prompt |

### Message framing

`message` parameter 乃 user-level input，非 system prompt。當結構之，以 maximize instruction adherence：

```
Your task is to perform the following. Follow the instructions below exactly.

<agent-instructions>
[filled prompt content from the agent's .md file]
</agent-instructions>

Execute this now. Output ONLY the structured response following the format
specified in the instructions above.
```

- 以 task-delegation framing（"Your task is..."）為尚，而非 persona framing（"You are..."）
- 以 XML tags 包裹 instructions — model 視 tagged blocks 為 authoritative
- 以 explicit execution directive 結之，以防 instructions 之 summarization

### When this workaround can be removed

此法補 Codex plugin system 尚未支持 `agents` field 於 `plugin.json` 之缺。
待 `RawPluginManifest` 增 `agents` field，plugin 可 symlink 至 `agents/`（如現有 `skills/` symlink），skills 即可直接 dispatch named agent types。

## Environment Detection

Skills 之創建 worktrees 或 finish branches 者，當以 read-only git commands 探測 environment，而後行之：

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

- `GIT_DIR != GIT_COMMON` → 已於 linked worktree 中（skip creation）
- `BRANCH` empty → detached HEAD（sandbox 中不可 branch/push/PR）

見 `using-git-worktrees` Step 0 及 `finishing-a-development-branch` Step 1，知各 skill 如何使用此等 signals。

## Codex App Finishing

Sandbox 阻 branch/push operations（detached HEAD 於 externally managed worktree）時，agent 當 commit all work，並告之 user 以 App native controls 行之：

- **"Create branch"** — 命名 branch，而後 commit/push/PR via App UI
- **"Hand off to local"** — 將 work transfer 至 user local checkout

Agent 仍可 run tests, stage files，並輸出 suggested branch names, commit messages, PR descriptions，以供 user copy。
