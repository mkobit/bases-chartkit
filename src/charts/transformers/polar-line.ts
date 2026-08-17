import type { EChartsOption, LineSeriesOption, DatasetComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption, getTitleOption } from './utils'
import * as R from 'remeda'

export interface PolarLineTransformerOptions extends BaseTransformerOptions {
  readonly stack?: boolean
  readonly smooth?: boolean
  readonly areaStyle?: boolean
  readonly seriesProp?: string
}

interface PolarLineDataPoint {
  readonly x: string
  readonly y: number | null
  readonly s: string
}

export function createPolarLineChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  options?: PolarLineTransformerOptions,
): EChartsOption {
  const seriesProp = options?.seriesProp
  const isStacked = options?.stack
  const isSmooth = options?.smooth
  const hasAreaStyle = options?.areaStyle
  const xAxisLabel = options?.xAxisLabel ?? xProp
  const yAxisLabel = options?.yAxisLabel ?? yProp

  const normalizedData: ReadonlyArray<PolarLineDataPoint> = R.map(
    data,
    (item): PolarLineDataPoint => {
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

  const angleAxisData: readonly string[] = R.pipe(
    normalizedData,
    R.map(d => d.x),
    R.unique(),
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

  const seriesOptions: ReadonlyArray<LineSeriesOption> = seriesNames.map((name, idx): LineSeriesOption => {
    const datasetIndex = seriesProp ? idx + 1 : 0

    return {
      type: 'line',
      name: name,
      coordinateSystem: 'polar',
      datasetIndex: datasetIndex,
      encode: { angle: 'x',
        radius: 'y' },
      smooth: isSmooth,
      areaStyle: hasAreaStyle ? {} : undefined,
      ...(isStacked ? { stack: 'total' } : {}),
    }
  })

  const title = getTitleOption(options)

  const opt: EChartsOption = {
    dataset: [...datasets],
    ...(title ? { title } : {}),
    // Angle/radius carry no axis chrome unlike a cartesian chart, so without a
    // name a first-time reader has no label for what's being encoded (bck-aie.27
    // feedback: "i dont know what to look for here"). Also shift the plot down
    // and shrink it slightly when a title is present, so the polar circle
    // doesn't start under the title/legend chrome -- the polar analog of
    // theme-river's singleAxis top offset.
    polar: {
      center: ['50%', title ? '56%' : '50%'],
      radius: title ? '70%' : '75%',
    },
    angleAxis: {
      type: 'category',
      data: [...angleAxisData],
      startAngle: 90,
      name: xAxisLabel,
    },
    radiusAxis: {
      name: yAxisLabel,
    },
    series: [...seriesOptions],
    tooltip: {
      trigger: 'axis',
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }

  return opt
}
