import type { EChartsOption, LineSeriesOption, DatasetComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption } from './utils'
import * as R from 'remeda'

export interface PolarLineTransformerOptions extends BaseTransformerOptions {
  readonly stack?: boolean
  readonly smooth?: boolean
  readonly areaStyle?: boolean
  readonly seriesProp?: string
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
  const yAxisLabel = options?.yAxisLabel ?? yProp

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

  const angleAxisData = R.pipe(
    normalizedData,
    R.map(d => d.x),
    R.unique(),
  )

  const seriesNames = R.pipe(
    normalizedData,
    R.map(d => d.s),
    R.unique(),
  )

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

  const seriesOptions: LineSeriesOption[] = seriesNames.map((name, idx) => {
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
