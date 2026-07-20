import type { EChartsOption, SeriesOption, LineSeriesOption, BarSeriesOption, DatasetComponentOption, DataZoomComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption } from './utils'
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

  // Responsive logic
  const isMobile = options?.isMobile ?? false
  const containerWidth = options?.containerWidth ?? 1000
  const isCompact = isMobile || containerWidth < 600

  // Smart axis rotation: if compact and not specified, rotate 45 degrees
  const xAxisRotate = options?.xAxisLabelRotate ?? (isCompact && !flipAxis ? 45 : 0)

  // 1. Normalize Data for Dataset
  // Structure: { x, y, s }
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

  // 2. Get unique X values (categories) for the axis
  const xAxisData: readonly string[] = R.pipe(
    normalizedData,
    R.map(d => d.x),
    R.unique(),
  )

  // 3. Identify Series
  const seriesNames: readonly string[] = R.pipe(
    normalizedData,
    R.map(d => d.s),
    R.unique(),
  )

  // 4. Create Datasets
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

  // 5. Build Series Options
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
            ...(isStacked ? { stack: 'total' } : {}),
          }
          return barItem
        })()
  })

  // DataZoom for compact mode (only if not flipped, for X-axis scrolling)
  // We use both slider (visible) and inside (touch/mouse wheel)
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

  const opt: EChartsOption = {
    dataset: [...datasets],
    xAxis: flipAxis
      ? {
          type: 'value',
          name: yAxisLabel,
        }
      : {
          type: 'category',
          data: [...xAxisData],
          name: xAxisLabel,
          axisLabel: {
            rotate: xAxisRotate,
            interval: isCompact ? 'auto' : 0, // Auto-hide labels if they overlap in compact mode
          },
        },
    yAxis: flipAxis
      ? {
          type: 'category',
          data: [...xAxisData],
          name: xAxisLabel,
          axisLabel: {
            rotate: xAxisRotate,
          },
        }
      : {
          type: 'value',
          name: yAxisLabel,
        },
    series: [...seriesOptions],
    tooltip: {
      trigger: 'axis',
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
