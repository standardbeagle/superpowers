#!/bin/bash
# Small A/B eval: feed skill + scenario to glm (claude harness + z.ai backend).
# Usage: run.sh <skill-path> <scenario-path> <out-path>
#
# Requires `glm` alias from ~/.bashrc. Alias sets ANTHROPIC_BASE_URL, token, models.
# Run with:  bash -ic './run.sh skill.md scenario.md out.txt'   (interactive loads alias)
# or:        source ~/.bashrc && ./run.sh skill.md scenario.md out.txt
set -euo pipefail

SKILL="$1"
SCENARIO="$2"
OUT="$3"

shopt -s expand_aliases
# Source just the glm alias line from ~/.bashrc (avoid running full rc in non-interactive).
GLM_ALIAS=$(grep -E "^alias glm=" ~/.bashrc || true)
if [ -z "$GLM_ALIAS" ]; then
    echo "error: 'alias glm=' not found in ~/.bashrc" >&2
    exit 1
fi
eval "$GLM_ALIAS"

PROMPT=$(cat <<EOF
The following skill is currently ACTIVE and you MUST follow it:

---BEGIN SKILL---
$(cat "$SKILL")
---END SKILL---

Now respond to this scenario:

$(cat "$SCENARIO")
EOF
)

glm --model sonnet -p "$PROMPT" > "$OUT" 2>&1
echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
