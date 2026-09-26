## Context

Obsidian Bases views define their configuration through a flat array of `BasesOptions` (`text`, `toggle`, `dropdown`, `property`).
The Obsidian Bases UI does not support dynamic lists or repeating fieldsets.
ECharts provides native support for mixed series types (`bar`, `line`, `scatter`) within a single Cartesian coordinate system, including dual independent or tick-aligned y-axes (`yAxis: [leftAxis, rightAxis]`).

## Goals / Non-Goals

**Goals:**
- Provide a clean, declarative configuration surface for composite/overlay charts that works natively within Obsidian Bases' UI options inspector.
- Support common composite visualization patterns: bar with trend line, stacked bar with overlay line, and bar with target/scatter marks.
- Support dual y-axes with tick alignment for metrics with disparate units or scales (e.g. absolute currency vs. percentage).
- Deliver a working proof-of-concept view and transformer that fulfills the requirements of `bck-i9b.13`.

**Non-Goals:**
- Multi-chart dashboard layouts composing separate visual widgets in a grid (scoped to epic `bck-i9b.9`).
- Arbitrary unbounded N-series configuration UI in the Bases settings panel (inherent platform UI limitation of `BasesOptions`).
- Non-Cartesian overlays (e.g. scatter over pie or map overlays).

## Decisions

### Decision 1: Dedicated `combo-chart` view type
- **Choice**: Register a distinct `combo-chart` view type rather than adding optional overlay fields to `bar-chart` or `stacked-bar-chart`.
- **Rationale**: Keeps basic single-series chart views simple and focused. Avoids confusion over whether a chart is primarily a bar or line chart, and makes combo chart capabilities directly discoverable from the Bases view type selector.
- **Alternatives considered**:
  - *Adding overlay fields to `BaseChartView`*: Clutters every single chart's settings drawer with options that are irrelevant for 95% of views.
  - *Generic `composite-chart` with raw JSON array*: Unfriendly to non-technical users and unsupported by Obsidian's visual settings UI.

### Decision 2: Two-stream configuration surface with grouping
- **Choice**: Expose primary stream (`yAxisProp`, `primaryType`, optional `seriesProp`, optional `stack`) and secondary stream (`overlayProp`, `overlayType`, `overlayDualAxis`, `overlayLabel`).
- **Rationale**: Matches the dominant real-world composite pattern (a primary volume/breakdown metric paired with an overlay benchmark or rate metric). Fully fits within flat `BasesOptions`.
- **Alternatives considered**:
  - *Multiple overlay props (`overlay1`, `overlay2`, etc.)*: Adds visual clutter for rare edge cases. Power users can use `echartsOption` for tertiary layers.

### Decision 3: Coordinated dual y-axes with aligned ticks
- **Choice**: When `overlayDualAxis` is enabled, generate two y-axes with `position: 'left'` and `position: 'right'`, both with `alignTicks: true`.
- **Rationale**: Prevents mismatched gridlines across the chart while allowing distinct value formats and ranges.

## Risks / Trade-offs

- [UI expressiveness ceiling] Flat options cannot configure 3+ independent metric overlays visually → Supported via `echartsOption` JSON override for edge cases.
- [Missing overlay values] Some rows may contain null/undefined overlay values → Transformer normalizes null values gracefully without dropping primary category bars.
