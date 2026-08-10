# Example vault generator

This directory contains deterministic generator scripts for `bases-chartkit-example-vault/`.

## Layout conventions
- One primary `.base` file per chart type directory (e.g. `bar/Basic.base`), containing multiple views in `views:` array for settings variants.
- Separate `.base` files (e.g. `bar/CustomData.base`) are created only when a variant requires a materially different note schema or dataset.
- Backing notes live under `<chartType>/notes/` (e.g. `bar/notes/Dept-Spend-0.md`).

## Demo data richness guidelines
- Generate 10-30 datapoints minimum per series (15-50 for heatmaps, maps, timelines, and candlesticks) to showcase full visual potential.
- Avoid monotone or single-color defaults; leverage multi-color palettes, itemStyle gradients, or category groupings.
- Include natural variance: peaks, valleys, non-monotonic trends, and negative values where applicable.
- Use realistic Temporal dates (spanning weeks, months, or quarters) rather than tight consecutive days.

## Standard variant view set per chart type
Every chart type spec in `scripts/vault-gen/registry.ts` should aim to provide a set of views exercising key ECharts capabilities:
1. `Basic <ChartType>`: canonical default view with default styling and clear axis titles.
2. Layout or orientation variant: horizontal/flipped axes, polar projections, or radial orientations.
3. Theme and visual styling variant: custom color palettes, dark theme backgrounds, or gradient fills.
4. Feature and option variant: custom tooltips, legend placements (top/bottom/right), dataZoom controls, or markLine/markPoint annotations.
5. Domain-specific variants: attribute sizing (bubble/effect-scatter), stacking, or multi-series grouping.
