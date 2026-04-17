#!/bin/bash
# Small A/B eval: feed skill + scenario to a backend alias from ~/.bashrc.
# Usage: run.sh <skill-path> <scenario-path> <out-path> [alias-name]
#   alias-name defaults to "glm" (z.ai backend). Also supports "minmax", "kimic", "mimo".
set -euo pipefail

SKILL="$1"
SCENARIO="$2"
OUT="$3"
ALIAS_NAME="${4:-glm}"

shopt -s expand_aliases
if [ "$ALIAS_NAME" = "claude" ]; then
    # Use stock claude (no env override) — defaults to user's Anthropic config.
    ALIAS_LINE="alias claude='claude --dangerously-skip-permissions'"
else
    ALIAS_LINE=$(grep -E "^alias ${ALIAS_NAME}=" ~/.bashrc || true)
    if [ -z "$ALIAS_LINE" ]; then
        echo "error: 'alias ${ALIAS_NAME}=' not found in ~/.bashrc" >&2
        exit 1
    fi
fi
eval "$ALIAS_LINE"

PROMPT=$(cat <<EOF
The following skill is currently ACTIVE and you MUST follow it:

---BEGIN SKILL---
$(cat "$SKILL")
---END SKILL---

Now respond to this scenario:

$(cat "$SCENARIO")
EOF
)

# Extract the command portion from the alias line: strip "alias NAME='" prefix and trailing "'".
CMD=$(printf '%s' "$ALIAS_LINE" | sed -E "s/^alias ${ALIAS_NAME}='//; s/'$//")
eval "$CMD --model sonnet -p \"\$PROMPT\"" > "$OUT" 2>&1
echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
