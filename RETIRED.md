# RETIRED — Migrated to standardbeagle-tools

**Date**: 2026-05-09
**Migration target**: `~/work/standardbeagle-tools/`

All 14 superpowers skills + 7 agents have been absorbed into the
`standardbeagle-tools` plugin marketplace. This fork remains only as
the sync point for upstream `obra/superpowers` updates.

## Skill migration map

Skills now live across these target plugins:

| Source skill                      | Target plugin       |
|-----------------------------------|---------------------|
| brainstorming                     | brainstorming       |
| dispatching-parallel-agents       | workflow            |
| executing-plans                   | workflow            |
| finishing-a-development-branch    | workflow            |
| receiving-code-review             | compound-review     |
| requesting-code-review            | compound-review     |
| subagent-driven-development       | workflow            |
| systematic-debugging              | compound-review (debug) |
| test-driven-development           | dev-standards       |
| using-git-worktrees               | workflow            |
| using-superpowers                 | (orchestration)     |
| verification-before-completion    | dev-standards       |
| writing-plans                     | dartai/workflow     |
| writing-skills                    | dev-standards       |

## Upstream tracking

Fork status as of retirement:
- `origin/main`: standardbeagle/superpowers (this fork)
- `upstream/main`: obra/superpowers
- Fork: 19 ahead, 61 behind upstream

## Re-pulling upstream changes

When a future upstream change in `obra/superpowers` is worth absorbing:

```bash
cd ~/work/marketplaces/superpowers
git fetch upstream
git diff origin/main..upstream/main -- skills/<skill-name>/SKILL.md
# Apply selectively to ~/work/standardbeagle-tools/plugins/<plugin>/skills/<skill>/
```

## Local-only content NOT in upstream

The brainstorming companion (TypeScript/bun server + web UI) under
`skills/brainstorming/companion/` is local work, ahead of upstream.
Upstream introduced a lightweight `server.cjs` alternative — see
`skills/brainstorming/scripts/` after fetching upstream.

## When to fully remove this fork

Remove the entire `~/work/marketplaces/superpowers/` directory when:
1. The standardbeagle-tools brainstorming companion is independent of
   any superpowers source patterns, AND
2. Upstream stops being a useful reference (or upstream is archived).

Until then, keep this directory for diff-based update checks.
