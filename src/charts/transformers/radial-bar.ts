import type { EChartsOption, BarSeriesOption, DatasetComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption } from './utils'
import * as R from 'remeda'

export interface RadialBarTransformerOptions extends BaseTransformerOptions {
  readonly stack?: boolean
  readonly seriesProp?: string
  readonly maxAngle?: number
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
  const normalizedData = R.map(
    data,
    (item) => {
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
  const angleAxisData = R.pipe(
    normalizedData,
    R.map(d => d.x),
    R.unique(),
  )

  // 3. Identify Series
  const seriesNames = R.pipe(
    normalizedData,
    R.map(d => d.s),
    R.unique(),
  )

  // 4. Create Datasets
  const sourceDataset: DatasetComponentOption = { source: normalizedData }

  // If we have a seriesProp, we create filtered datasets for each series
  const filterDatasets: DatasetComponentOption[] = seriesProp
    ? seriesNames.map(name => ({
        transform: {
          type: 'filter',
          config: { dimension: 's',
            value: name },
        },
      }))
    : []

  const datasets: DatasetComponentOption[] = [sourceDataset,
    ...filterDatasets]

  // 5. Build Series Options
  const seriesOptions: BarSeriesOption[] = seriesNames.map((name, idx) => {
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
    dataset: datasets,
    polar: {
    },
    angleAxis: {
      type: 'category',
      data: angleAxisData,
      startAngle: 90,
    },
    radiusAxis: {
    },
    series: seriesOptions,
    tooltip: {
      trigger: 'axis',
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }

  return opt
}
