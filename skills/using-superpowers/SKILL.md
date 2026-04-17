---
name: using-superpowers
description: Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
若汝思有 1% 之機 skill 適於所為，汝**絕對必**呼 skill。

若 skill 適汝任，汝無擇。必用之。

此不可議。此非可選。汝不可託辭而出。
</EXTREMELY-IMPORTANT>

## Instruction Priority

Superpowers skill 覆預設 system prompt 行為，然 **user 指令恆優**：

1. **User 之明指令**（CLAUDE.md、GEMINI.md、AGENTS.md、直請） — 最高
2. **Superpowers skills** — 覆預設 system 行為於相衝處
3. **預設 system prompt** — 最低

若 CLAUDE.md、GEMINI.md、或 AGENTS.md 言「勿用 TDD」而 skill 言「常用 TDD」，遵 user 指令。User 主。

## How to Access Skills

**In Claude Code：** 用 `Skill` tool。呼 skill 時其內容載且示汝——直遵。勿於 skill 檔用 Read。

**In Copilot CLI：** 用 `skill` tool。Skill 自 installed plugin 自發。`skill` tool 與 Claude Code 之 `Skill` tool 同。

**In Gemini CLI：** Skill 經 `activate_skill` tool 啟。Gemini session 起時載 metadata，按需啟全內容。

**他環境：** 察 platform 文件以知 skill 如何載。

## Platform Adaptation

Skill 用 Claude Code tool 名。非 CC platform：見 `references/copilot-tools.md`（Copilot CLI）、`references/codex-tools.md`（Codex）以察等價。Gemini CLI user 經 GEMINI.md 自動獲 tool 映射。

# Using Skills

## The Rule

**任答或行前呼適或所請之 skill。** 有 1% 機 skill 適 = 應呼以察。若所呼 skill 於情境不適，則不用之。

```dot
digraph skill_flow {
    "User message received" [shape=doublecircle];
    "About to EnterPlanMode?" [shape=doublecircle];
    "Already brainstormed?" [shape=diamond];
    "Invoke brainstorming skill" [shape=box];
    "Might any skill apply?" [shape=diamond];
    "Invoke Skill tool" [shape=box];
    "Announce: 'Using [skill] to [purpose]'" [shape=box];
    "Has checklist?" [shape=diamond];
    "Create TodoWrite todo per item" [shape=box];
    "Follow skill exactly" [shape=box];
    "Respond (including clarifications)" [shape=doublecircle];

    "About to EnterPlanMode?" -> "Already brainstormed?";
    "Already brainstormed?" -> "Invoke brainstorming skill" [label="no"];
    "Already brainstormed?" -> "Might any skill apply?" [label="yes"];
    "Invoke brainstorming skill" -> "Might any skill apply?";

    "User message received" -> "Might any skill apply?";
    "Might any skill apply?" -> "Invoke Skill tool" [label="yes, even 1%"];
    "Might any skill apply?" -> "Respond (including clarifications)" [label="definitely not"];
    "Invoke Skill tool" -> "Announce: 'Using [skill] to [purpose]'";
    "Announce: 'Using [skill] to [purpose]'" -> "Has checklist?";
    "Has checklist?" -> "Create TodoWrite todo per item" [label="yes"];
    "Has checklist?" -> "Follow skill exactly" [label="no"];
    "Create TodoWrite todo per item" -> "Follow skill exactly";
}
```

## Red Flags

此等念即止——汝在託辭：

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | 問即任。察 skill。 |
| "I need more context first" | 察 skill 於澄清問前。 |
| "Let me explore the codebase first" | Skill 告汝如何探。先察。 |
| "I can check git/files quickly" | 檔缺對話 context。察 skill。 |
| "Let me gather information first" | Skill 告汝如何採訊。 |
| "This doesn't need a formal skill" | Skill 存則用之。 |
| "I remember this skill" | Skill 變。讀當版。 |
| "This doesn't count as a task" | 行 = 任。察 skill。 |
| "The skill is overkill" | 簡物必成繁。用之。 |
| "I'll just do this one thing first" | 行前先察。 |
| "This feels productive" | 無律之行耗時。Skill 防之。 |
| "I know what that means" | 知概念 ≠ 用 skill。呼之。 |

## Skill Priority

多 skill 可適時，依此序：

1. **Process skills first**（brainstorming、debugging）- 定**如何**接任
2. **Implementation skills second**（frontend-design、mcp-builder）- 引執行

「建 X」→ 先 brainstorming，後 implementation。
「修此 bug」→ 先 debugging，後 domain-specific。

## Skill Types

**Rigid**（TDD、debugging）：確遵。勿改其律。

**Flexible**（pattern）：依 context 應原則。

Skill 本告汝為何型。

## User Instructions

指令述**何**，非**如何**。"Add X" 或 "Fix Y" 不意跳 workflow。
