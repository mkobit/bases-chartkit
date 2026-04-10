# Obsidian Bases Charts

[![Obsidian Badge](https://img.shields.io/badge/obsidian-plugin-7a3ee8?logo=obsidian)](https://obsidian.md/)
[![CI](https://github.com/mkobit/obsidian-bases-charts/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mkobit/obsidian-bases-charts/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/mkobit/obsidian-bases-charts)](https://github.com/mkobit/obsidian-bases-charts/releases)
[![Codecov](https://codecov.io/gh/mkobit/obsidian-bases-charts/branch/main/graph/badge.svg)](https://codecov.io/gh/mkobit/obsidian-bases-charts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh)

> [!WARNING]
> **Work in Progress** as of 2026-04-10. This plugin is under active development.

## Project summary

Obsidian Bases Charts is a visualization-heavy plugin for Obsidian that bridges the gap between your vault's data and powerful, interactive charts.

By leveraging the **Obsidian Bases API** for data querying and **Apache ECharts** for rendering, this plugin allows you to create dynamic visualizations driven directly by the properties in your notes.

## Goals

- **Data-Driven**: Utilize the Obsidian Bases API to query and aggregate data from your vault properties efficiently.
- **Advanced Visualization**: Provide a comprehensive suite of chart types (Bar, Line, Pie, Scatter, Heatmap, and more) using the robust Apache ECharts library.
- **Flexible Configuration**: Enable users to define and customize views using intuitive configuration files (`.base` files) or UI-based settings.
- **Performance**: Ensure high performance and responsiveness, even with large datasets, by using optimized data structures and chart rendering techniques.
- **Extensibility**: Lay the groundwork for future integrations, such as Mermaid diagrams or custom chart types.

## Development

This project uses [Bun](https://bun.sh/) and Node.js.

### Prerequisites

- Node.js (v22 recommended)
- Bun

### Setup

Install dependencies:

```bash
bun install
```

### Building

To build the plugin in watch mode (for development):

```bash
bun run dev
```

To build for production:

```bash
bun run build
```

### Automated testing

We use WebdriverIO for end-to-end testing.

```bash
bun run test:e2e
```

For more details, see [`e2e/AGENTS.md`](e2e/AGENTS.md).

### Manual testing

To test the plugin in Obsidian, you need to load the built files into a vault.

1.  **Prepare a Vault**: You can use the provided `example/` directory as a test vault, or create a new one.
2.  **Install the Plugin**: Create a directory inside your vault at `.obsidian/plugins/obsidian-bases-charts` (or your preferred ID).
3.  **Deploy Files**: Copy `main.js`, `manifest.json`, and `styles.css` into that directory.

For a smoother development experience, we recommend using the **Hot Reload** plugin:
-   [https://github.com/pjeby/hot-reload](https://github.com/pjeby/hot-reload)

### Resources

For more information on building Obsidian plugins, refer to the official documentation:
-   [Build a plugin - Obsidian Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

### License

MIT License
