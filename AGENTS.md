# Obsidian Bases Charts

This repository contains a bare-bones Obsidian plugin built with strict TypeScript enforcement and automated CI. It serves as the foundation for a future visualization-heavy plugin using **Apache ECharts** and the Obsidian Bases API.

## Code Style & Protocols
The project enforces strict Functional Programming principles via `eslint`.
-   **No Mutation / Loops**: Use `const` exclusively. Use declarative transforms (e.g., `map`, `filter`).
-   **Data Transformation**: Prefer **[Remeda](https://remedajs.com/)** (`remeda`) for complex data pipelines.
-   **Date/Time**: Use the `Temporal` API (via `temporal-polyfill`) for logic. Avoid `Date`. Use `moment` only for Obsidian UI formatting.
-   **Localization**: Use `i18next` with keys from `src/lang/locales/en.json`. See `src/lang/AGENTS.md`.

## Commands
| Command | Description |
| :--- | :--- |
| `bun run build` | Full production build (Type check + Build). |
| `bun test` | Run unit tests. |
| `bun run test:e2e` | Run end-to-end tests via WebdriverIO. |

## Dependency Installation Handling
We reject new versions of packages for a period of time configured via `minimumReleaseAge` in `.bunfig.toml` as a security measure.
If `bun install` fails to find a package, do not try to alter the package manager or bypass the configuration.
Instead, identify and install an older, stable version of the package.
