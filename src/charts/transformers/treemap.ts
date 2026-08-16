import type { EChartsOption, TreemapSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { buildHierarchy, type HierarchyNode } from './hierarchy'
import { THEME_TOKENS } from './palette'

export type TreemapTransformerOptions = BaseTransformerOptions

function asTreemapData(data: readonly HierarchyNode[]): TreemapSeriesOption['data'] {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-restricted-syntax -- our HierarchyNode tree shape structurally matches ECharts' treemap data nodes; bridge past the wide OptionDataValue union.
  return data as unknown as TreemapSeriesOption['data']
}

export function createTreemapChartOption(
  data: BasesData,
  pathProp: string,
  valueProp: string,
  // Common transformer options (legend, etc.) are accepted for parity with
  // every other chart type but deliberately unused: ECharts' TreemapSeries
  // has no legendVisualProvider (unlike PieSeries), so a legend component
  // would only ever show one entry for the single unnamed series, not one
  // per node. A per-node legend would need real engineering (explicit
  // legend.data + matching itemStyle.color per root branch) beyond what
  // this shared options plumbing provides.
  _options?: TreemapTransformerOptions,
): EChartsOption {
  const hierarchyData = buildHierarchy(
    data,
    pathProp,
    valueProp,
  )

  const seriesItem: TreemapSeriesOption = {
    type: 'treemap',
    data: asTreemapData(hierarchyData),
    roam: false, // Zoom/pan
    breadcrumb: {
      show: true,
    },
    // Render the whole tree at once and print each non-leaf node's name in a
    // header strip. Without this, ECharts' defaults (upperLabel.show:false,
    // gapWidth:0, click-to-drill) collapse every branch into an ungrouped grid
    // of leaf tiles -- the "no tree map relationship, all flat boxes" bug. The
    // header strips plus the per-level gaps below are what make the nesting
    // legible (a sunburst gets this for free from its concentric rings).
    upperLabel: {
      show: true,
      height: 24,
    },
    label: {
      show: true,
      formatter: '{b}',
    },
    // Per-depth framing: a gap between sibling tiles exposes the parent tile
    // behind them, so each branch reads as a contained group. Gaps widen toward
    // the root so the top-level branches separate most strongly, and leaves get
    // a light saturation lift so a branch's tiles read as one family. Gaps are
    // derived from tile geometry/color rather than a hardcoded background, so
    // they hold up in both light and dark themes.
    levels: [
      { itemStyle: { gapWidth: 5 } },
      { itemStyle: { gapWidth: 3 },
        colorSaturation: [0.3, 0.5] },
      { itemStyle: { gapWidth: 1 },
        colorSaturation: [0.35, 0.6] },
    ],
    // ECharts' treemap defaultOption hardcodes itemStyle.borderColor to an
    // opaque white design token with no dark-theme override (dark.js's
    // treemap entry only restyles the breadcrumb, unlike sunburst's, which
    // swaps borderColor to match the chart background). Treemap renders
    // each tile as two composited rects -- a full-size one filled with
    // borderColor, and a borderWidth-inset one filled with the real color
    // on top -- so at the default borderWidth: 0 this was never a visible
    // divider so much as a sub-pixel sliver of the background rect peeking
    // through at squarify-layout rounding edges. An explicit transparent
    // background rect removes that artifact in both themes instead of
    // picking one theme's background color to hardcode instead.
    itemStyle: {
      borderColor: THEME_TOKENS.transparent,
    },
  }

  return {
    series: [seriesItem],
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}',
    },
  }
}
