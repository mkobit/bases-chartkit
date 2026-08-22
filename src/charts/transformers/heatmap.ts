import type { EChartsOption, HeatmapSeriesOption, DatasetComponentOption, VisualMapComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getAxisLabelOverlapOptions } from './axis-labels'
import { getNestedValue, isRecord, safeToString } from './bases-values'
import { getLegendOption } from './legend'
import { asTooltipFormatter } from './tooltip'
import { formatCompactVisualMapLabel } from './visual-map'
import { DEFAULT_SEQUENTIAL_COLOR_GRADIENT } from './palette'
import * as R from 'remeda'

export interface HeatmapTransformerOptions extends BaseTransformerOptions {
  readonly valueProp?: string
  readonly valueLabel?: string
}

type HeatmapCell = Readonly<{
  x: string
  y: string
  value: number
}>

function isHeatmapCell(val: unknown): val is HeatmapCell {
  return isRecord(val) && 'x' in val && 'y' in val && 'value' in val
}

export interface HeatmapTooltipParam {
  readonly marker?: string
  // See scatter.ts's identical comment: ECharts' CallbackDataParams.value for
  // an object-row dataset source is the WHOLE raw row, not a single scalar --
  // and (also as in scatter.ts) that object-row shape means the default
  // formatter-less tooltip can never label multi-dim values via `dimensions`/
  // `displayName` here either, so a custom formatter is required.
  readonly value: unknown
}

// See scatter.ts's identical comment for why this is required at all.
function formatTooltip(param: HeatmapTooltipParam, xLabel: string, yLabel: string, valueLabel: string): string {
  const row = isHeatmapCell(param.value) ? param.value : null
  if (!row) {
    return ''
  }
  const marker = param.marker ?? ''
  return `${marker}${xLabel}: ${row.x}<br/>${yLabel}: ${row.y}<br/>${valueLabel}: ${row.value.toLocaleString('en-US')}`
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

  const isMobile = options?.isMobile ?? false
  const containerWidth = options?.containerWidth ?? 1000
  const isCompact = isMobile || containerWidth < 600

  const normalizedData: ReadonlyArray<HeatmapCell> = R.map(
    data,
    (item): HeatmapCell => {
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

  const xAxisData: readonly string[] = R.pipe(
    normalizedData,
    R.map(d => d.x),
    R.unique(),
  )
  const yAxisData: readonly string[] = R.pipe(
    normalizedData,
    R.map(d => d.y),
    R.unique(),
  )

  // A time-of-day heatmap can carry 24 hourly x categories; at 0deg every
  // label collides. Thin/rotate them with the same shared helper the cartesian
  // charts use (flipAxis:false -- heatmap has no axis-swap mode), honoring an
  // explicit xAxisLabelRotate override when the user set one.
  const { interval: xAxisInterval, rotate: xAxisRotate } = getAxisLabelOverlapOptions(
    xAxisData.length,
    isCompact,
    options?.xAxisLabelRotate,
    false,
  )

  const values: readonly number[] = R.map(
    normalizedData,
    d => d.value,
  )

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
      // Cells span the full light->dark ramp, so no single ink color stays
      // readable on every background. A light halo (textBorderColor) outlines
      // dark ink so the value reads on both the pale low cells and the deep
      // high cells -- this is the "numbers are confusing" legibility fix; the
      // sequential ramp above already lets color carry magnitude so the number
      // is now confirmation, not the sole signal.
      color: '#1a1a19',
      textBorderColor: 'rgba(255, 255, 255, 0.85)',
      textBorderWidth: 2,
      formatter: (params) => {
        const val = isHeatmapCell(params.value) ? params.value.value : undefined
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
    bottom: options?.visualMapTop !== undefined ? undefined : '0%',
    top: options?.visualMapTop,
    type: options?.visualMapType ?? 'continuous',
    formatter: formatCompactVisualMapLabel,
    inRange: {
      color: options?.visualMapColor && options.visualMapColor.length > 0
        ? [...options.visualMapColor]
        : [...DEFAULT_SEQUENTIAL_COLOR_GRADIENT],
    },
  }

  const opt: EChartsOption = {
    dataset: [dataset],
    tooltip: {
      position: 'top',
      formatter: asTooltipFormatter((param: HeatmapTooltipParam) => formatTooltip(param, xAxisLabel, yAxisLabel, options?.valueLabel ?? valueProp ?? 'Value')),
    },
    grid: {
      height: '70%',
      top: '10%',
    },
    xAxis: {
      type: 'category',
      data: [...xAxisData], // Keeping explicit categories for order control
      name: xAxisLabel,
      splitArea: { show: true },
      axisLabel: { rotate: xAxisRotate, interval: xAxisInterval },
    },
    yAxis: {
      type: 'category',
      data: [...yAxisData],
      name: yAxisLabel,
      splitArea: { show: true },
    },
    visualMap: visualMapOption,
    series: [seriesItem],
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }

  return opt
}
