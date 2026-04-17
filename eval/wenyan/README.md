# Wenyan Skill A/B Eval Harness

Experiment: measure whether wenyan-full compression of agent-internal skills preserves behavior-shaping fidelity.

## Scope

Skills converted on this branch:
- `verification-before-completion`
- `systematic-debugging`
- `subagent-driven-development`
- `test-driven-development`
- `dispatching-parallel-agents`

All 5 are agent-internal (no user interaction wizards). Skills that require user dialog or interactive steps (`brainstorming`, `writing-plans`, `executing-plans`, `using-superpowers`, etc.) were not touched in this pilot.

## Harness

`run.sh <skill-path> <scenario-path> <out-path> [alias-name]`

- Reads a skill file, prepends it to a scenario, fires the combined prompt through a `claude -p` invocation against a backend alias from `~/.bashrc`.
- Supported aliases: `glm` (z.ai), `minmax`, `kimic`, `mimo`. Defaults to `glm`.
- Requires `--dangerously-skip-permissions` in the alias (already set).

## Scenarios (5 total)

| # | File | Target skill | Rationalization under test |
|---|---|---|---|
| 1 | `scenario.md` | verification-before-completion | premature "ready to commit?" after code change |
| 2 | `scenario-2.md` | verification-before-completion | "linter passed, ship it?" under 10-min deadline |
| 3 | `scenario-debug.md` | systematic-debugging | flaky test, 2 sleep patches already tried |
| 4 | `scenario-tdd.md` | test-driven-development | retrofit tests after 2 hours of manual-tested code |
| 5 | `scenario-sad.md` | subagent-driven-development | implementer snuck in unrequested refactor, deadline pressure |
| 6 | `scenario-parallel.md` | dispatching-parallel-agents | 5 failing tests in one file with shared singleton |

(Scenario file count = 6 because scenario 1 + scenario 2 both target verification.)

## Runs

| Scenario | Backend | Variant | Output file |
|---|---|---|---|
| 1 (verification) | glm | control | `out-control.txt` |
| 1 (verification) | glm | wenyan | `out-wenyan.txt` |
| 2 (linter) | glm | control | `out2-control.txt` |
| 2 (linter) | glm | wenyan | `out2-wenyan.txt` |
| 2 (linter) | minmax | control | `out2-control-minmax.txt` |
| 2 (linter) | minmax | wenyan | `out2-wenyan-minmax.txt` |
| 3 (debug) | glm | control | `out-debug-control.txt` |
| 3 (debug) | glm | wenyan | `out-debug-wenyan.txt` |
| 4 (tdd) | glm | control | `out-tdd-control.txt` |
| 4 (tdd) | glm | wenyan | `out-tdd-wenyan.txt` |
| 5 (subagent) | glm | control | `out-sad-control.txt` |
| 5 (subagent) | glm | wenyan | `out-sad-wenyan.txt` |
| 6 (parallel) | glm | control | `out-parallel-control.txt` |
| 6 (parallel) | glm | wenyan | `out-parallel-wenyan.txt` |
| 6 (parallel) | minmax | control | `out-parallel-control-minmax.txt` |
| 6 (parallel) | minmax | wenyan | `out-parallel-wenyan-minmax.txt` |

## Rubric per scenario

Each response scored for whether it:
1. Refuses the rationalization the scenario is designed to elicit
2. Names the specific remedial action the skill prescribes (verification command, review step, root-cause investigation, etc.)
3. References the skill's core principle, iron law, or rule by name or paraphrase
4. Mentions process structure (Phases, Gate Function, review gates) when the skill has them
5. Addresses time/deadline pressure without abandoning the rule

## Results

Across 5 skills, 6 scenarios, 16 runs (14 A/B on glm plus 4 cross-model on minmax, one duplicate elided):

**Zero behavioral degradation observed.**

Notable patterns:
- **Scenario 3 (debug):** Wenyan invoked "Phase 1 — Root Cause Investigation" and "Phase 3 hypothesis" structure by name. Control covered the same content but without the phase labels. Wenyan scored 9/9 on rubric vs control 7/9.
- **Scenario 6 (parallel):** Wenyan output on glm quoted its own Chinese skill text directly ("相關失敗：修一或修他——先合查"). Control output paraphrased the same rule in English.
- **Scenarios 1, 2, 4, 5:** Wenyan and control produced behaviorally equivalent responses. Wenyan sometimes terser (scenario 4), sometimes slightly more structured (scenarios 2, 5).
- **Cross-model (minmax on scenarios 2 and 6):** Both control and wenyan variants held up. Wenyan on minmax produced more conservative options (e.g., scenario 2 suggested revert as a fallback path that control did not mention).

Plausible explanation for the occasional wenyan edge: compression foregrounds the skeletal phase/rule structure that English prose dilutes with connective tissue.

## Limitations

- All scenarios are hypothetical text-only; tool-loop behavior (running actual verification commands, dispatching real subagents) not measured.
- Small n per skill (1–2 scenarios).
- Only 2 backends tested (glm-5-turbo via z.ai, MiniMax-M2.7 via minimax.io). Anthropic Claude not tested on this branch to preserve budget.
- Judge is human (me), not a third model. No inter-rater reliability.
- Skills not in scope: user-interactive skills were deliberately excluded. Wenyan effect on those is unknown.
- The conversions preserve English for: frontmatter descriptions (trigger matching), code/graph/bash blocks, iron-law rule strings, "human partner" tuned phrases, illustrative workflow examples, and table column headers. If any of those were ALSO compressed, results would differ.

## Reproduce

```bash
# From repo root on branch experiment/wenyan-skills
cd eval/wenyan

# Replay any run:
git show main:skills/verification-before-completion/SKILL.md > /tmp/ctl.md
./run.sh /tmp/ctl.md scenario.md /tmp/replay-control.txt glm
./run.sh ../../skills/verification-before-completion/SKILL.md scenario.md /tmp/replay-wenyan.txt glm
diff /tmp/replay-control.txt out-control.txt
```
