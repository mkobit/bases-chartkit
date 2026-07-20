import type { EChartsOption, TreemapSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { buildHierarchy, type HierarchyNode } from './hierarchy'

export type TreemapTransformerOptions = BaseTransformerOptions

function asTreemapData(data: readonly HierarchyNode[]): TreemapSeriesOption['data'] {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-restricted-syntax -- our HierarchyNode tree shape structurally matches ECharts' treemap data nodes; bridge past the wide OptionDataValue union.
  return data as unknown as TreemapSeriesOption['data']
}

export function createTreemapChartOption(
  data: BasesData,
  pathProp: string,
  valueProp: string,
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
      show: false,
    },
    label: {
      show: true,
      formatter: '{b}',
    },
    itemStyle: {
      borderColor: '#fff',
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
