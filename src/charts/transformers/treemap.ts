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
    label: {
      show: true,
      formatter: '{b}',
    },
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
