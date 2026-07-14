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

    for segment in re.split(r"[;&|()]+", command):
        words = segment.split()
        idx = 0
        while idx < len(words) and re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", words[idx]):
            idx += 1
        if idx >= len(words):
            continue
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
            return


if __name__ == "__main__":
    main()
