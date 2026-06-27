# Obsidian Bases Charts

[![Obsidian Badge](https://img.shields.io/badge/obsidian-plugin-7a3ee8?logo=obsidian)](https://obsidian.md/)
[![CI](https://github.com/mkobit/obsidian-bases-charts/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mkobit/obsidian-bases-charts/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/mkobit/obsidian-bases-charts)](https://github.com/mkobit/obsidian-bases-charts/releases)
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

## Installation (manual)

- Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release.
- Place them in `<vault>/.obsidian/plugins/obsidian-bases-charts/`.
- Enable the plugin in Obsidian Settings → Community Plugins.

## Usage

Create a minimal sample `.base` file to visualize your data. For example, to analyze stock data with a candlestick chart:

```yaml
properties:
  note.Date:
    displayName: Date
  note.Open:
    displayName: Open Price
  note.Close:
    displayName: Close Price
  note.High:
    displayName: High Price
  note.Low:
    displayName: Low Price
views:
  - type: candlestick-chart
    name: AAPL Stock Analysis
    xAxisProp: note.Date
    openProp: note.Open
    closeProp: note.Close
    highProp: note.High
    lowProp: note.Low
    showLegend: true
    filters:
      and:
        - note.Symbol == "AAPL"
```

This configuration extracts the Date, Open, Close, High, and Low properties from your vault's notes that contain stock data for "AAPL" and renders a candlestick chart representing the stock analysis.

<!-- TODO: screenshot -->

## Configuration

The plugin provides several user-configurable settings accessible in the Obsidian Settings panel:

- **Default Height**: The default height for rendered charts (e.g., `500px`).
- **Up Color**: The color to represent an upward trend or positive value (e.g., in candlestick charts).
- **Down Color**: The color to represent a downward trend or negative value.
- **Global Theme**: Select a default theme for all charts from the default options or your custom themes.
- **Custom Themes**: Define and manage custom JSON-based ECharts themes.

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

We use Playwright for end-to-end testing.

```bash
bun run test:e2e
```

The e2e fixture downloads a sandboxed Linux Obsidian AppImage to `.obsidian-cache/` on first run and launches it against a temp-copied vault for each test.
For more details, see [`e2e/AGENTS.md`](e2e/AGENTS.md).

### Manual testing

To test the plugin against a real Obsidian instance using the canonical in-repo `obsidian-bases-charts-example-vault/`:

```bash
bun run build      # generate main.js / styles.css
bun run vault:dev  # downloads sandboxed Obsidian (one-time, cached) and launches it
```

The launcher uses the same `scripts/lib/obsidian.ts` module as the e2e fixture. On WSL2, GUI rendering goes through WSLg.

To install the built plugin into the example vault without launching (e.g. for use with your own Obsidian):

```bash
bun run vault:install
```

This populates `obsidian-bases-charts-example-vault/.obsidian/plugins/obsidian-bases-charts/` with the freshly built `main.js`, `manifest.json`, and `styles.css`.

### Resources

For more information on building Obsidian plugins, refer to the official documentation:
-   [Build a plugin - Obsidian Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

### License

MIT License
