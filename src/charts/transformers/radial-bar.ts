import type { EChartsOption, BarSeriesOption, DatasetComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption } from './utils'
import * as R from 'remeda'

export interface RadialBarTransformerOptions extends BaseTransformerOptions {
  readonly stack?: boolean
  readonly seriesProp?: string
}

interface RadialBarDataPoint {
  readonly x: string
  readonly y: number | null
  readonly s: string
}

export function createRadialBarChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  options?: RadialBarTransformerOptions,
): EChartsOption {
  const seriesProp = options?.seriesProp
  const isStacked = options?.stack
  const yAxisLabel = options?.yAxisLabel ?? yProp

  // 1. Normalize Data for Dataset
  // Structure: { x, y, s }
  const normalizedData: ReadonlyArray<RadialBarDataPoint> = R.map(
    data,
    (item): RadialBarDataPoint => {
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

  // 2. Get unique X values (categories) for the angle axis
  const angleAxisData: readonly string[] = R.pipe(
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

  // If we have a seriesProp, we create filtered datasets for each series
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
  const seriesOptions: ReadonlyArray<BarSeriesOption> = seriesNames.map((name, idx): BarSeriesOption => {
    const datasetIndex = seriesProp ? idx + 1 : 0

    return {
      type: 'bar',
      name: name,
      coordinateSystem: 'polar',
      datasetIndex: datasetIndex,
      // polar bar series read radius/angle encode channels, not x/y —
      // with x/y no bars render even though the angleAxis still draws.
      encode: { angle: 'x',
        radius: 'y' },
      ...(isStacked ? { stack: 'total' } : {}),
    }
  })

  const opt: EChartsOption = {
    dataset: [...datasets],
    polar: {
    },
    angleAxis: {
      type: 'category',
      data: [...angleAxisData],
      startAngle: 90,
    },
    radiusAxis: {
    },
    series: [...seriesOptions],
    tooltip: {
      trigger: 'axis',
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }

  return opt
}
