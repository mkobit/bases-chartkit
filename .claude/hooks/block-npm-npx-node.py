#!/usr/bin/env python3
"""PreToolUse hook (Bash matcher): blocks bare npm/npx/node invocations.

This repo is bun-only (see AGENTS.md) -- bun has equivalents for all three.
"""
import json
import os
import re
import sys

BUN_EQUIVALENT = {
    "npm": "'bun info' (or 'bun add'/'bun remove'/'bun run', etc.)",
    "npx": "'bunx'",
    "node": "'bun run <script>' or 'bun <file>.js'",
}


def main() -> None:
    payload = json.load(sys.stdin)
    command = payload.get("tool_input", {}).get("command", "")
    if not command:
        return

    # Only the leading token of the whole command is checked (after any
    # VAR=value prefixes). Scanning for npm/npx/node after shell operators
    # anywhere in the string is too rigid: it can't tell a real chained
    # command from the same text appearing inside a quoted string or a
    # heredoc body (e.g. a PR description passed via `gh pr create --body
    # "$(cat <<'EOF' ... EOF)"`), which produces false positives.
    words = command.split()
    idx = 0
    while idx < len(words) and re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", words[idx]):
        idx += 1
    if idx >= len(words):
        return

    base = os.path.basename(words[idx])
    if base in BUN_EQUIVALENT:
        reason = (
            f"This repo is bun-only (see AGENTS.md). "
            f"Use {BUN_EQUIVALENT[base]} instead of bare '{base}'."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        }))


if __name__ == "__main__":
    main()
