import type { EChartsOption, SeriesOption, LineSeriesOption, BarSeriesOption, DatasetComponentOption, DataZoomComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption, getAxisLabelOverlapOptions, isRecord, asTooltipFormatter } from './utils'
import { formatValue } from './formatters'
import * as R from 'remeda'

export interface CartesianTransformerOptions extends BaseTransformerOptions {
  readonly smooth?: boolean
  readonly showSymbol?: boolean
  readonly areaStyle?: boolean
  readonly stack?: boolean
  readonly seriesProp?: string
}

interface CartesianDataPoint {
  readonly x: string
  readonly y: number | null
  readonly s: string
}

function isCartesianDataPoint(val: unknown): val is CartesianDataPoint {
  return isRecord(val) && 'x' in val && 'y' in val && 's' in val
}

export interface CartesianTooltipParam {
  readonly seriesName?: string
  readonly marker?: string
  // See scatter.ts's identical comment: ECharts' CallbackDataParams.value for
  // an object-row dataset source is the WHOLE raw row, not a single scalar --
  // and that object-row shape means the default formatter-less tooltip can
  // never label multi-dim values via `dimensions`/`displayName` here either,
  // so a custom formatter is required.
  readonly value: unknown
}

interface CartesianTooltipRow {
  readonly param: CartesianTooltipParam
  readonly row: CartesianDataPoint
}

// Axis-trigger tooltips hand back one param per series active at that
// category, same array shape as pictorial-bar.ts's formatTooltip.
function formatTooltip(
  params: CartesianTooltipParam | ReadonlyArray<CartesianTooltipParam>,
  xAxisLabel: string,
): string {
  const list: ReadonlyArray<CartesianTooltipParam> = Array.isArray(params) ? params : [params]
  const validRows: ReadonlyArray<CartesianTooltipRow> = list
    .map((p): CartesianTooltipRow | null => (isCartesianDataPoint(p.value) ? { param: p, row: p.value } : null))
    .filter((r): r is CartesianTooltipRow => r !== null)
  const first = validRows[0]
  if (!first) {
    return ''
  }
  const lines = validRows.map(({ param, row }) => {
    const marker = param.marker ?? ''
    const yText = row.y === null ? '-' : row.y.toLocaleString('en-US')
    return `${marker}${row.s}: ${yText}`
  }).join('<br/>')
  return `<b>${xAxisLabel}: ${first.row.x}</b><br/>${lines}`
}

export function createCartesianChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  chartType: 'bar' | 'line',
  options?: CartesianTransformerOptions,
): EChartsOption {
  const seriesProp = options?.seriesProp
  const isStacked = options?.stack
  const flipAxis = options?.flipAxis ?? false
  const xAxisLabel = options?.xAxisLabel ?? xProp
  const yAxisLabel = options?.yAxisLabel ?? yProp

  const isMobile = options?.isMobile ?? false
  const containerWidth = options?.containerWidth ?? 1000
  const isCompact = isMobile || containerWidth < 600

  const normalizedData: ReadonlyArray<CartesianDataPoint> = R.map(
    data,
    (item): CartesianDataPoint => {
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
  const { interval: xAxisInterval, rotate: xAxisRotate } = getAxisLabelOverlapOptions(
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

  const seriesOptions: ReadonlyArray<SeriesOption> = seriesNames.map((name, idx): SeriesOption => {
    const datasetIndex = seriesProp ? idx + 1 : 0

    const base = {
      name: name,
      datasetIndex: datasetIndex,
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
    } as const

    return chartType === 'line'
      ? ((): LineSeriesOption => {
          const lineItem: LineSeriesOption = {
            ...base,
            type: 'line',
            ...(options?.smooth ? { smooth: true } : {}),
            ...(options?.showSymbol === false ? { showSymbol: false } : {}),
            ...(options?.areaStyle ? { areaStyle: {} } : {}),
            ...(isStacked ? { stack: 'total' } : {}),
          }
          return lineItem
        })()
      : ((): BarSeriesOption => {
          const barItem: BarSeriesOption = {
            ...base,
            type: 'bar',
            ...(!seriesProp ? { colorBy: 'data' as const } : {}),
            ...(isStacked ? { stack: 'total' } : {}),
          }
          return barItem
        })()
  })

  const dataZoomOptions: ReadonlyArray<DataZoomComponentOption> = (isCompact && !flipAxis)
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
  const yAxisFormat = options?.yAxisFormat ?? options?.valueFormat

  const opt: EChartsOption = {
    dataset: [...datasets],
    xAxis: flipAxis
      ? {
          type: 'value',
          name: yAxisLabel,
          ...(yAxisFormat ? { axisLabel: { formatter: (val: unknown) => formatValue(val, yAxisFormat) } } : {}),
        }
      : {
          type: 'category',
          data: [...xAxisData],
          name: xAxisLabel,
          axisLabel: {
            rotate: xAxisRotate,
            interval: xAxisInterval,
            ...(xAxisFormat ? { formatter: (val: unknown) => formatValue(val, xAxisFormat) } : {}),
          },
        },
    yAxis: flipAxis
      ? {
          type: 'category',
          data: [...xAxisData],
          name: xAxisLabel,
          axisLabel: {
            rotate: xAxisRotate,
            ...(xAxisFormat ? { formatter: (val: unknown) => formatValue(val, xAxisFormat) } : {}),
          },
        }
      : {
          type: 'value',
          name: yAxisLabel,
          ...(yAxisFormat ? { axisLabel: { formatter: (val: unknown) => formatValue(val, yAxisFormat) } } : {}),
        },
    series: [...seriesOptions],
    tooltip: {
      trigger: 'axis',
      formatter: asTooltipFormatter((params: CartesianTooltipParam | ReadonlyArray<CartesianTooltipParam>) => formatTooltip(params, xAxisLabel)),
    },
    grid: {
      containLabel: true,
      bottom: (isCompact && !flipAxis) ? 40 : undefined, // Make room for slider
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
    ...(dataZoomOptions.length > 0 ? { dataZoom: [...dataZoomOptions] } : {}),
  }

  return opt
}
