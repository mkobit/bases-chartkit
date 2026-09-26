## Why

Users frequently need to visualize related metrics of differing scales and types within a single coordinated view, such as displaying actual revenue as bars alongside a target or margin rate as an overlaid trend line.
Currently, Obsidian Bases chart views only support a single visual series type per view, forcing users to choose either separate uncoordinated views or complex custom JSON overrides.

## What Changes

- Introduce a unified `combo-chart` (composite chart) view type that allows overlaying multiple series types (e.g. line over bar or line over stacked bar) on shared axes.
- Provide a first-class visual configuration surface in Obsidian Bases with options for primary series (metric property, render type, optional stacking) and overlay series (metric property, render type, dual y-axis toggle).
- Add the `createComboChartOption` transformer supporting Cartesian coordinates with optional secondary Y-axes and axis-aligned tooltips across mixed series.
- Provide a proof-of-concept view and transformer with unit test coverage and locale strings.

## Capabilities

### New Capabilities
- `chart-views/combo-chart`: Composite chart view allowing primary and overlaid series of different render types on shared or dual axes.

### Modified Capabilities

None.

## Impact

- **New files**: `src/views/combo-chart-view.ts`, `src/charts/transformers/combo.ts`, `tests/charts/transformers/combo.test.ts`.
- **Modified files**: `src/charts/registered-views.ts`, `src/charts/transformer.ts`, `src/main.ts`, `src/lang/locales/en.json`.
- **APIs and dependencies**: Uses existing Apache ECharts cartesian and dual-axis features; no new third-party dependencies required.
