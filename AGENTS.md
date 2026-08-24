# Bases Chart Kit

This repository contains a bare-bones Obsidian plugin built with strict TypeScript enforcement and automated CI. It serves as the foundation for a future visualization-heavy plugin using **Apache ECharts** and the Obsidian Bases API.

## Code style and protocols
The project enforces strict Functional Programming principles via `eslint`.
-   **No Mutation / Loops**: Use `const` exclusively. Use declarative transforms (e.g., `map`, `filter`).
-   **Data Transformation**: Prefer **[Remeda](https://remedajs.com/)** (`remeda`) for complex data pipelines.
-   **Date/Time**: Use the `Temporal` API for logic. Avoid `Date`. Use `moment` only for Obsidian UI formatting.
-   **Localization**: Use `i18next` with keys from `src/lang/locales/en.json`. See `src/lang/AGENTS.md`.
-   **Vault generation**: See `scripts/vault-gen/AGENTS.md` for layout, demo-data richness, and variant view set conventions.

## Commands & Task Workflows
The repository supports both `mise run` (for task DAG resolution, parallel checks, and source/output caching) and direct `bun run` scripts.

| Command | `mise` Equivalent | Description |
| :--- | :--- | :--- |
| `bun run build` | `mise run build` | Full production build with incremental source/output caching. |
| `bun test` | `mise run test` | Run unit tests. |
| `bun run test:e2e` | - | Run end-to-end tests via Playwright (pops a real Obsidian window, on Linux/WSLg). |
| `bun run test:e2e:headless` | `mise run test:e2e:headless` | Run Playwright E2E tests headlessly under `xvfb-run` matching CI. |
| `bun run vault:dev` | `mise run vault:dev` | Launch sandboxed Linux Obsidian against `bases-chartkit-example-vault/`. |
| `bun run vault:install` | - | Install the built plugin into the example vault without launching. |
| `bun run clean` | `mise run clean` | Remove generated build/test output artifacts. |
| `bun run openspec:validate` | `mise run openspec:validate` | Validate OpenSpec specifications and changes. |
| - | `mise run check` | Run all verification checks (typecheck, lint, budgets, specs, unit tests) in parallel. |
| - | `mise tasks ls` | List all available tasks and descriptions. |

## Dependency installation handling
We reject new versions of packages for a period of time configured via `minimumReleaseAge` in `.bunfig.toml` as a security measure.
If `bun install` fails to find a package, do not try to alter the package manager or bypass the configuration.
Instead, identify and install an older, stable version of the package.

## Issue tracking
This project tracks longer-lived follow-up work with `bd` (beads), running in stealth mode (local-only, not git-tracked).
Run `bd prime` at session start for full workflow context.
Use `bd ready` to find open issues, `bd show <id>` for details, `bd update <id> --claim` to claim one, `bd close <id>` to complete one.
Sync across machines manually with `bd dolt push`/`bd dolt pull` when needed — it does not happen automatically.
This is separate from in-session task tracking (`TaskCreate`) and cross-session memory (`MEMORY.md`) — use whichever tool fits the scope of what you're tracking.

## Git
`main` is protected — direct pushes are rejected (GH013); open a PR instead.
Confirm with the user before `git push`, PR merges, or other shared-state/hard-to-reverse actions.
