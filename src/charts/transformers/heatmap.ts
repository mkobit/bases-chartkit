import type { EChartsOption, HeatmapSeriesOption, DatasetComponentOption, VisualMapComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption } from './utils'
import * as R from 'remeda'

export interface HeatmapTransformerOptions extends BaseTransformerOptions {
  readonly valueProp?: string
}

// ECharts doesn't derive a default cell label from our dataset + encode series
// (only from raw [x, y, value] tuples), so `label.formatter` is required or
// every cell renders as '-'. Isolate the loosely-typed callback param.
function asHeatmapLabelParams(params: unknown): Readonly<{ value?: Readonly<{ value?: number }> }> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- ECharts label formatter callback params are typed as a wide union; bridge to the shape this chart's label formatter actually receives.
  return params as Readonly<{ value?: Readonly<{ value?: number }> }>
}

function asHeatmapCellValue(params: unknown): number | undefined {
  return asHeatmapLabelParams(params).value?.value
}

export function createHeatmapChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  options?: HeatmapTransformerOptions,
): EChartsOption {
  const valueProp = options?.valueProp
  const xAxisLabel = options?.xAxisLabel ?? xProp
  const yAxisLabel = options?.yAxisLabel ?? yProp
  const xAxisRotate = options?.xAxisLabelRotate ?? 0

  // 1. Normalize Data
  // Structure: { x, y, value }
  const normalizedData = R.map(
    data,
    (item) => {
      const xValRaw = getNestedValue(
        item,
        xProp,
      )
      const yValRaw = getNestedValue(
        item,
        yProp,
      )
      const valNum = valueProp
        ? Number(getNestedValue(
            item,
            valueProp,
          ))
        : Number.NaN

      return {
        x: xValRaw === undefined || xValRaw === null ? 'Unknown' : safeToString(xValRaw),
        y: yValRaw === undefined || yValRaw === null ? 'Unknown' : safeToString(yValRaw),
        value: Number.isNaN(valNum) ? 0 : valNum,
      }
    },
  )

  // 2. Identify Categories for Axes
  const xAxisData = R.pipe(
    normalizedData,
    R.map(d => d.x),
    R.unique(),
  )
  const yAxisData = R.pipe(
    normalizedData,
    R.map(d => d.y),
    R.unique(),
  )

  const values = R.map(
    normalizedData,
    d => d.value,
  )

  // Determine Min/Max
  const dataMin = values.length > 0 ? Math.min(...values) : 0
  const dataMax = values.length > 0 ? Math.max(...values) : 10

  const finalMinVal = options?.visualMapMin !== undefined ? options.visualMapMin : dataMin
  const finalMaxVal = options?.visualMapMax !== undefined ? options.visualMapMax : dataMax

  const dataset: DatasetComponentOption = {
    source: normalizedData,
  }

  const seriesItem: HeatmapSeriesOption = {
    type: 'heatmap',
    datasetIndex: 0,
    encode: {
      x: 'x',
      y: 'y',
      value: 'value',
      tooltip: ['x',
        'y',
        'value'],
    },
    label: {
      show: true,
      formatter: (params: unknown) => {
        const val = asHeatmapCellValue(params)
        return val === undefined || Number.isNaN(val) ? '' : safeToString(val)
      },
    },
  }

  const visualMapOption: VisualMapComponentOption = {
    min: finalMinVal,
    max: finalMaxVal,
    calculable: true,
    orient: options?.visualMapOrient ?? 'horizontal',
    left: options?.visualMapLeft ?? 'center',
    bottom: options?.visualMapTop !== undefined ? undefined : '0%', // Default bottom if top not set
    top: options?.visualMapTop,
    type: options?.visualMapType ?? 'continuous',
    ...(options?.visualMapColor ? { inRange: { color: options.visualMapColor } } : {}),
  }

  const opt: EChartsOption = {
    dataset: [dataset],
    tooltip: {
      position: 'top',
    },
    grid: {
      height: '70%',
      top: '10%',
    },
    xAxis: {
      type: 'category',
      data: xAxisData, // Keeping explicit categories for order control
      name: xAxisLabel,
      splitArea: { show: true },
      axisLabel: { rotate: xAxisRotate },
    },
    yAxis: {
      type: 'category',
      data: yAxisData,
      name: yAxisLabel,
      splitArea: { show: true },
    },
    visualMap: visualMapOption,
    series: [seriesItem],
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }

  return opt
}
