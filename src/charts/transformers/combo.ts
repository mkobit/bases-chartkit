import type {
  EChartsOption,
  SeriesOption,
  LineSeriesOption,
  BarSeriesOption,
  ScatterSeriesOption,
  DataZoomComponentOption,
  YAXisComponentOption,
} from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getAxisLabelOverlapOptions } from './axis-labels'
import { getNestedValue, isRecord, safeToString } from './bases-values'
import { getLegendOption } from './legend'
import { asTooltipFormatter } from './tooltip'
import { formatValue } from './formatters'
import * as R from 'remeda'

export interface ComboTransformerOptions extends BaseTransformerOptions {
  readonly primaryType?: 'bar' | 'line'
  readonly primaryStack?: boolean
  readonly seriesProp?: string
  readonly overlayProp?: string
  readonly overlayType?: 'line' | 'bar' | 'scatter'
  readonly overlayDualAxis?: boolean
  readonly overlayYAxisLabel?: string
  readonly overlayYAxisFormat?: string
  readonly smooth?: boolean
  readonly showSymbol?: boolean
}

export interface ComboTooltipParam {
  readonly seriesName?: string
  readonly marker?: string
  readonly value: unknown
  readonly seriesType?: string
}

interface NormalizedRow {
  readonly x: string
  readonly primaryY: number | null
  readonly series: string
  readonly overlayY: number | null
}

function formatTooltipValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }
  if (Array.isArray(value) && value.length > 1) {
    const val = value[1]
    return typeof val === 'number' ? val.toLocaleString('en-US') : safeToString(val)
  }
  if (isRecord(value) && 'y' in value) {
    const val = value.y
    return typeof val === 'number' ? val.toLocaleString('en-US') : safeToString(val)
  }
  if (typeof value === 'number') {
    return value.toLocaleString('en-US')
  }
  return safeToString(value)
}

function formatComboTooltip(
  params: ComboTooltipParam | ReadonlyArray<ComboTooltipParam>,
  xAxisLabel: string,
): string {
  const list: ReadonlyArray<ComboTooltipParam> = Array.isArray(params) ? params : [params]
  const first = list[0]
  if (!first) {
    return ''
  }
  const category = ((): string => {
    if (Array.isArray(first.value) && first.value.length > 0) {
      return safeToString(first.value[0])
    }
    if (isRecord(first.value) && 'x' in first.value) {
      return safeToString(first.value.x)
    }
    return ''
  })()

  const lines = list.map((param) => {
    const marker = param.marker ?? ''
    const seriesName = param.seriesName ?? ''
    const valText = formatTooltipValue(param.value)
    return `${marker}${seriesName}: ${valText}`
  }).join('<br/>')

  return category ? `<b>${xAxisLabel}: ${category}</b><br/>${lines}` : lines
}

export function createComboChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  options?: ComboTransformerOptions,
): EChartsOption {
  const seriesProp = options?.seriesProp
  const primaryType = options?.primaryType ?? 'bar'
  const primaryStack = options?.primaryStack ?? (seriesProp !== undefined)
  const overlayProp = options?.overlayProp
  const overlayType = options?.overlayType ?? 'line'
  const overlayDualAxis = options?.overlayDualAxis ?? true

  const xAxisLabel = options?.xAxisLabel ?? xProp
  const yAxisLabel = options?.yAxisLabel ?? yProp
  const overlayYAxisLabel = options?.overlayYAxisLabel ?? (overlayProp ?? 'Overlay')

  const isMobile = options?.isMobile ?? false
  const containerWidth = options?.containerWidth ?? 1000
  const isCompact = isMobile || containerWidth < 600

  const normalizedData: ReadonlyArray<NormalizedRow> = R.map(
    data,
    (item): NormalizedRow => {
      const xValRaw = getNestedValue(item, xProp)
      const primaryRaw = Number(getNestedValue(item, yProp))
      const sValRaw = seriesProp ? getNestedValue(item, seriesProp) : undefined
      const overlayRaw = overlayProp ? Number(getNestedValue(item, overlayProp)) : null

      return {
        x: xValRaw === undefined || xValRaw === null ? 'Unknown' : safeToString(xValRaw),
        primaryY: Number.isNaN(primaryRaw) ? null : primaryRaw,
        series: seriesProp && sValRaw !== undefined && sValRaw !== null ? safeToString(sValRaw) : yAxisLabel,
        overlayY: overlayRaw === null || Number.isNaN(overlayRaw) ? null : overlayRaw,
      }
    },
  )

  const xAxisData: readonly string[] = R.pipe(
    normalizedData,
    R.map(d => d.x),
    R.unique(),
  )

  const { interval: xAxisInterval, rotate: xAxisRotate } = getAxisLabelOverlapOptions(
    xAxisData.length,
    isCompact,
    options?.xAxisLabelRotate,
    false,
  )

  const seriesNames: readonly string[] = R.pipe(
    normalizedData,
    R.map(d => d.series),
    R.unique(),
  )

  const primarySeriesList: ReadonlyArray<SeriesOption> = seriesNames.map((name): SeriesOption => {
    const seriesRows = normalizedData.filter(d => d.series === name)
    const seriesData: readonly (number | null)[] = xAxisData.map((cat) => {
      const match = seriesRows.find(r => r.x === cat)
      return match?.primaryY ?? null
    })

    return primaryType === 'line'
      ? ((): LineSeriesOption => ({
          name,
          type: 'line',
          yAxisIndex: 0,
          data: [...seriesData],
          ...(primaryStack ? { stack: 'primary_total' } : {}),
          ...(options?.smooth ? { smooth: true } : {}),
          ...(options?.showSymbol === false ? { showSymbol: false } : {}),
        }))()
      : ((): BarSeriesOption => ({
          name,
          type: 'bar',
          yAxisIndex: 0,
          data: [...seriesData],
          ...(primaryStack ? { stack: 'primary_total' } : {}),
          ...(!seriesProp ? { colorBy: 'data' as const } : {}),
        }))()
  })

  const overlaySeriesList: ReadonlyArray<SeriesOption> = overlayProp
    ? [
        overlayType === 'bar'
          ? ((): BarSeriesOption => {
              const overlayData: readonly (number | null)[] = xAxisData.map((cat) => {
                const match = normalizedData.find(d => d.x === cat && d.overlayY !== null)
                return match?.overlayY ?? null
              })
              return {
                name: overlayYAxisLabel,
                type: 'bar',
                yAxisIndex: overlayDualAxis ? 1 : 0,
                data: [...overlayData],
              }
            })()
          : overlayType === 'scatter'
            ? ((): ScatterSeriesOption => {
                const overlayData: readonly (number | null)[] = xAxisData.map((cat) => {
                  const match = normalizedData.find(d => d.x === cat && d.overlayY !== null)
                  return match?.overlayY ?? null
                })
                return {
                  name: overlayYAxisLabel,
                  type: 'scatter',
                  yAxisIndex: overlayDualAxis ? 1 : 0,
                  data: [...overlayData],
                }
              })()
            : ((): LineSeriesOption => {
                const overlayData: readonly (number | null)[] = xAxisData.map((cat) => {
                  const match = normalizedData.find(d => d.x === cat && d.overlayY !== null)
                  return match?.overlayY ?? null
                })
                return {
                  name: overlayYAxisLabel,
                  type: 'line',
                  yAxisIndex: overlayDualAxis ? 1 : 0,
                  data: [...overlayData],
                  ...(options?.smooth ? { smooth: true } : {}),
                  ...(options?.showSymbol === false ? { showSymbol: false } : {}),
                }
              })(),
      ]
    : []

  const allSeries: ReadonlyArray<SeriesOption> = [...primarySeriesList, ...overlaySeriesList]

  const yAxisFormat = options?.yAxisFormat ?? options?.valueFormat
  const overlayYAxisFormat = options?.overlayYAxisFormat

  const yAxes: ReadonlyArray<YAXisComponentOption> = overlayProp && overlayDualAxis
    ? [
        {
          type: 'value',
          name: yAxisLabel,
          position: 'left',
          alignTicks: true,
          ...(yAxisFormat ? { axisLabel: { formatter: (val: unknown) => formatValue(val, yAxisFormat) } } : {}),
        },
        {
          type: 'value',
          name: overlayYAxisLabel,
          position: 'right',
          alignTicks: true,
          ...(overlayYAxisFormat ? { axisLabel: { formatter: (val: unknown) => formatValue(val, overlayYAxisFormat) } } : {}),
        },
      ]
    : [
        {
          type: 'value',
          name: yAxisLabel,
          position: 'left',
          ...(yAxisFormat ? { axisLabel: { formatter: (val: unknown) => formatValue(val, yAxisFormat) } } : {}),
        },
      ]

  const dataZoomOptions: ReadonlyArray<DataZoomComponentOption> = isCompact
    ? [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: 10,
          height: 20,
        },
        {
          type: 'inside',
          xAxisIndex: [0],
        },
      ]
    : []

  const xAxisFormat = options?.xAxisFormat

  const opt: EChartsOption = {
    xAxis: {
      type: 'category',
      data: [...xAxisData],
      name: xAxisLabel,
      axisLabel: {
        rotate: xAxisRotate,
        interval: xAxisInterval,
        ...(xAxisFormat ? { formatter: (val: unknown) => formatValue(val, xAxisFormat) } : {}),
      },
    },
    yAxis: [...yAxes],
    series: [...allSeries],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: asTooltipFormatter((params: ComboTooltipParam | ReadonlyArray<ComboTooltipParam>) =>
        formatComboTooltip(params, xAxisLabel),
      ),
    },
    grid: {
      containLabel: true,
      bottom: isCompact ? 40 : undefined,
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
    ...(dataZoomOptions.length > 0 ? { dataZoom: [...dataZoomOptions] } : {}),
  }

  return opt
}
