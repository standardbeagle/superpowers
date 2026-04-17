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

if ! type glm &>/dev/null; then
    echo "error: 'glm' alias not loaded. Run with: bash -ic './run.sh ...'" >&2
    exit 1
fi

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
