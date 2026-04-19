# Creation Log: Systematic Debugging Skill

提取关键技能并结构化、防弹化之参考范例。

## Source Material

自 `/Users/jesse/.claude/CLAUDE.md` 提取调试框架：
- 四阶段系统流程（Investigation → Pattern Analysis → Hypothesis → Implementation）
- 核心戒律：务求 root cause，不治 symptom
- 诸规则以抗时压与合理化

## Extraction Decisions

**当取者：**
- 四阶段框架之全备规则
- 反捷径（"NEVER fix symptom"、"STOP and re-analyze"）
- 抗压措辞（"even if faster"、"even if I seem in a hurry"）
- 各阶段之具体步骤

**当弃者：**
- 项目特有关联
- 同一规则之重复变体
- 叙事说明（压缩为原理）

## Structure Following skill-creation/SKILL.md

1. **Rich when_to_use** - 含 symptom 与 anti-pattern
2. **Type: technique** - 具步骤之具体流程
3. **Keywords** - "root cause"、"symptom"、"workaround"、"debugging"、"investigation"
4. **Flowchart** - "fix failed" 之决策点 → re-analyze 或添更多 fix
5. **Phase-by-phase breakdown** - 可扫描之 checklist 格式
6. **Anti-patterns section** - 当禁之行（此技能至为关键）

## Bulletproofing Elements

框架以抗压力下之合理化：

### Language Choices
- "ALWAYS" / "NEVER"（非 "should" / "try to"）
- "even if faster" / "even if I seem in a hurry"
- "STOP and re-analyze"（明示停顿）
- "Don't skip past"（捕获实际行为）

### Structural Defenses
- **Phase 1 required** - 不可 skip 至 implementation
- **Single hypothesis rule** - 强制思考，防止 shotgun fix
- **Explicit failure mode** - "IF your first fix doesn't work" 附强制行动
- **Anti-patterns section** - 明示捷径之状

### Redundancy
- Root cause 之令见於 overview、when_to_use、Phase 1、implementation rules
- "NEVER fix symptom" 四处异文出现
- 各阶段皆附 "don't skip" 之明示

## Testing Approach

依 skills/meta/testing-skills-with-subagents 造四验证测试：

### Test 1: Academic Context（无压）
- 简单 bug，无时压
- **结果：** 全然合规，调查周备

### Test 2: Time Pressure + Obvious Quick Fix
- 用户言"匆忙"，symptom fix 似易
- **结果：** 拒捷径，循全流，得真 root cause

### Test 3: Complex System + Uncertainty
- 多层故障，能否得 root cause 未明
- **结果：** 系统调查，溯穿诸层，得源

### Test 4: Failed First Fix
- Hypothesis 不中，欲添更多 fix
- **结果：** 止而 re-analyze，立新 hypothesis（无 shotgun）

**All tests passed.** 无合理化之迹。

## Iterations

### Initial Version
- 四阶段框架之全备
- Anti-patterns section
- "fix failed" 之 flowchart

### Enhancement 1: TDD Reference
- 添 skills/testing/test-driven-development 之链接
- 注 TDD 之 "simplest code" ≠ debugging 之 "root cause"
- 免方法论之混淆

## Final Outcome

防弹技能：
- ✅ 明令 root cause 之调查
- ✅ 抗压下之合理化
- ✅ 各阶段之具体步骤
- ✅ 明示 anti-patterns
- ✅ 经多重压力场景测试
- ✅ 明 TDD 之关系
- ✅ 待用

## Key Insight

**至要之防弹：** Anti-patterns section 示当下自觉合理之捷径。当 Claude 念"姑且添此一 quick fix"，见该模式列於禁条，乃生认知摩擦。

## Usage Example

遇 bug 之时：
1. Load skill：skills/debugging/systematic-debugging
2. Read overview（十秒）—— 复忆戒律
3. Follow Phase 1 checklist —— 强制调查
4. 若欲 skip —— 见 anti-pattern，止
5. Complete all phases —— root cause 得

**Time investment：** 五至十分钟
**Time saved：** 免 symptom-whack-a-mole 之数时

---

*Created: 2025-10-03*
*Purpose: Reference example for skill extraction and bulletproofing*
