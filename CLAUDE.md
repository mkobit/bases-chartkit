# obsidian-bases-charts

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session completion

Sync beads before ending a session: `bd dolt push`.
Confirm with the user before `git push`, PR merges, or other shared-state/hard-to-reverse actions — never push automatically.
<!-- END BEADS INTEGRATION -->

## Build, test, conventions

See `AGENTS.md` — build/test commands, code style, and repo conventions are documented there and apply to all agents working in this repo.
