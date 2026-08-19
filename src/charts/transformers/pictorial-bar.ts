import type { EChartsOption, PictorialBarSeriesOption, DatasetComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption, getAxisLabelOverlapOptions, isRecord, asTooltipFormatter } from './utils'
import * as R from 'remeda'

export interface PictorialBarTransformerOptions extends BaseTransformerOptions {
  readonly symbol?: string
  // BasesOptions dropdowns hand back their raw string key ('true'/'false'), not a boolean.
  readonly symbolRepeat?: boolean | 'fixed' | 'true' | 'false'
  readonly symbolClip?: boolean
  readonly symbolSize?: number | string
  readonly seriesProp?: string
}

interface PictorialBarDataPoint {
  readonly x: string
  readonly y: number | null
  readonly s: string
}

function isPictorialBarDataPoint(val: unknown): val is PictorialBarDataPoint {
  return isRecord(val) && 'x' in val && 'y' in val && 's' in val
}

export interface PictorialBarTooltipParam {
  readonly seriesName?: string
  readonly marker?: string
  // See scatter.ts's identical comment: ECharts' CallbackDataParams.value for
  // an object-row dataset source is the WHOLE raw row, not a single scalar --
  // and (also as in scatter.ts) that same object-row shape means the default
  // formatter-less tooltip can never label multi-dim values via `dimensions`/
  // `displayName` here either, so a custom formatter is required.
  readonly value: unknown
}

interface PictorialBarTooltipRow {
  readonly param: PictorialBarTooltipParam
  readonly row: PictorialBarDataPoint
}

function formatTooltip(params: PictorialBarTooltipParam | ReadonlyArray<PictorialBarTooltipParam>): string {
  const list: ReadonlyArray<PictorialBarTooltipParam> = Array.isArray(params) ? params : [params]
  const validRows: ReadonlyArray<PictorialBarTooltipRow> = list
    .map((p): PictorialBarTooltipRow | null => (isPictorialBarDataPoint(p.value) ? { param: p, row: p.value } : null))
    .filter((r): r is PictorialBarTooltipRow => r !== null)
  const first = validRows[0]
  if (!first) {
    return ''
  }
  const lines = validRows.map(({ param, row }) => {
    const marker = param.marker ?? ''
    const yText = row.y === null ? '-' : row.y.toLocaleString('en-US')
    return `${marker}${param.seriesName ?? ''}: ${yText}`
  }).join('<br/>')
  return `<b>${first.row.x}</b><br/>${lines}`
}

export function createPictorialBarChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  options?: PictorialBarTransformerOptions,
): EChartsOption {
  const seriesProp = options?.seriesProp
  const xAxisLabel = options?.xAxisLabel ?? xProp
  const yAxisLabel = options?.yAxisLabel ?? yProp
  const flipAxis = options?.flipAxis ?? false
  const isMobile = options?.isMobile ?? false
  const containerWidth = options?.containerWidth ?? 1000
  const isCompact = isMobile || containerWidth < 600

  const normalizedData: ReadonlyArray<PictorialBarDataPoint> = R.map(
    data,
    (item): PictorialBarDataPoint => {
      const xValRaw = getNestedValue(
        item,
        xProp,
      )
      const yValRaw = Number(getNestedValue(
        item,
        yProp,
      ))
      const sValRaw = seriesProp
        ? getNestedValue(
            item,
            seriesProp,
          )
        : undefined

      return {
        x: xValRaw === undefined || xValRaw === null ? 'Unknown' : safeToString(xValRaw),
        y: Number.isNaN(yValRaw) ? null : yValRaw,
        s: seriesProp && sValRaw !== undefined && sValRaw !== null ? safeToString(sValRaw) : yAxisLabel,
      }
    },
  )

  const xAxisData: readonly string[] = R.pipe(
    normalizedData,
    R.map(d => d.x),
    R.unique(),
  )

  // Smart axis label overlap avoidance: rotate/thin once compact mode or
  // category count makes rendering every label at 0deg unreadable.
  const { interval: categoryAxisInterval, rotate: categoryAxisRotate } = getAxisLabelOverlapOptions(
    xAxisData.length,
    isCompact,
    options?.xAxisLabelRotate,
    flipAxis,
  )

  const seriesNames: readonly string[] = R.pipe(
    normalizedData,
    R.map(d => d.s),
    R.unique(),
  )

  const sourceDataset: DatasetComponentOption = {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-restricted-syntax -- normalizedData's row shape varies per chart; ECharts dataset.source just needs plain records.
    source: normalizedData as unknown as Record<string, unknown>[],
  }

  const filterDatasets: ReadonlyArray<DatasetComponentOption> = seriesProp
    ? seriesNames.map((name): DatasetComponentOption => ({
        transform: {
          type: 'filter',
          config: { dimension: 's',
            value: name },
        },
      }))
    : []

  const datasets: ReadonlyArray<DatasetComponentOption> = [sourceDataset,
    ...filterDatasets]

  const seriesOptions: ReadonlyArray<PictorialBarSeriesOption> = seriesNames.map((name, idx): PictorialBarSeriesOption => {
    const datasetIndex = seriesProp ? idx + 1 : 0

    // Handle string booleans from BasesOptions dropdowns. Default to a repeating
    // pictogram when unset -- a single non-repeating symbol is stretched to
    // fill the entire bar's bounding box by ECharts, which for most symbols
    // (especially 'rect') is visually indistinguishable from a plain bar.
    const rawRepeat = options?.symbolRepeat
    const symbolRepeat = rawRepeat === undefined
      ? true
      : rawRepeat === 'true'
        ? true
        : rawRepeat === 'false'
          ? false
          : rawRepeat

    return {
      name: name,
      type: 'pictorialBar',
      datasetIndex: datasetIndex,
      ...(!seriesProp ? { colorBy: 'data' as const } : {}),
      // If flipped: X-Axis is Value (y data), Y-Axis is Category (x data)
      encode: flipAxis
        ? { x: 'y',
            y: 'x',
            tooltip: ['x',
              'y',
              's'] }
        : { x: 'x',
            y: 'y',
            tooltip: ['x',
              'y',
              's'] },
      symbol: options?.symbol || 'circle',
      symbolRepeat: symbolRepeat,
      symbolClip: options?.symbolClip,
      symbolSize: options?.symbolSize || '100%',
    }
  })

  const opt: EChartsOption = {
    dataset: [...datasets],
    xAxis: flipAxis
      ? {
          type: 'value',
          name: yAxisLabel,
          splitLine: { show: false },
        }
      : {
          type: 'category',
          data: [...xAxisData],
          name: xAxisLabel,
          axisLabel: {
            rotate: categoryAxisRotate,
            interval: categoryAxisInterval,
          },
          splitLine: { show: false },
        },
    yAxis: flipAxis
      ? {
          type: 'category',
          data: [...xAxisData],
          name: xAxisLabel,
          axisLabel: {
            rotate: categoryAxisRotate,
            interval: categoryAxisInterval,
          },
          splitLine: { show: false },
        }
      : {
          type: 'value',
          name: yAxisLabel,
          splitLine: { show: false },
        },
    series: [...seriesOptions],
    tooltip: {
      trigger: 'axis',
      formatter: asTooltipFormatter(formatTooltip),
    },
    grid: {
      containLabel: true,
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }

  return opt
}
