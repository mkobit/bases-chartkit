import type { EChartsOption, PictorialBarSeriesOption, DatasetComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption } from './utils'
import * as R from 'remeda'

export interface PictorialBarTransformerOptions extends BaseTransformerOptions {
  readonly symbol?: string
  readonly symbolRepeat?: boolean | 'fixed'
  readonly symbolClip?: boolean
  readonly symbolSize?: number | string
  readonly seriesProp?: string
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
  const xAxisRotate = options?.xAxisLabelRotate ?? 0
  const flipAxis = options?.flipAxis ?? false

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

  // 2. Get unique X values (categories) for the axis
  const xAxisData = R.pipe(
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
  const seriesOptions: PictorialBarSeriesOption[] = seriesNames.map((name, idx) => {
    const datasetIndex = seriesProp ? idx + 1 : 0

    // Handle string booleans from ViewOption dropdowns
    const rawRepeat = options?.symbolRepeat
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
    const symbolRepeat = (rawRepeat as any) === 'true' ? true : (rawRepeat as any) === 'false' ? false : rawRepeat

    return {
      name: name,
      type: 'pictorialBar',
      datasetIndex: datasetIndex,
      // Encode: Map dimensions to axes
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
    dataset: datasets,
    xAxis: flipAxis
      ? {
          type: 'value',
          name: yAxisLabel,
          splitLine: { show: false },
        }
      : {
          type: 'category',
          data: xAxisData,
          name: xAxisLabel,
          axisLabel: {
            rotate: xAxisRotate,
            interval: 0,
          },
          splitLine: { show: false },
        },
    yAxis: flipAxis
      ? {
          type: 'category',
          data: xAxisData,
          name: xAxisLabel,
          axisLabel: {
            rotate: xAxisRotate,
            interval: 0,
          },
          splitLine: { show: false },
        }
      : {
          type: 'value',
          name: yAxisLabel,
          splitLine: { show: false },
        },
    series: seriesOptions,
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      containLabel: true,
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }

  return opt
}
