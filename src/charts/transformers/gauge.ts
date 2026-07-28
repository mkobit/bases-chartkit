import type { EChartsOption, GaugeSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue } from './utils'
import * as R from 'remeda'

export type GaugeAggregation = 'sum' | 'avg' | 'min' | 'max' | 'last'

export interface GaugeColorBand {
  readonly threshold: number
  readonly color: string
}

export interface GaugeTransformerOptions extends BaseTransformerOptions {
  readonly min?: number
  readonly max?: number
  readonly aggregation?: GaugeAggregation
  readonly colorBands?: ReadonlyArray<GaugeColorBand>
}

function aggregateValues(values: readonly number[], aggregation: GaugeAggregation): number {
  if (values.length === 0) {
    return 0
  }
  switch (aggregation) {
    case 'avg':
      return R.mean(values) ?? 0
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
    case 'last':
      return values.at(-1) ?? 0
    case 'sum':
      return R.sum(values)
  }
}

export function createGaugeChartOption(
  data: BasesData,
  valueProp: string,
  options?: GaugeTransformerOptions,
): EChartsOption {
  const values = R.pipe(
    data,
    R.map(item => Number(getNestedValue(item, valueProp))),
    R.filter(val => !Number.isNaN(val)),
  )

  const total = aggregateValues(values, options?.aggregation ?? 'sum')

  const min = options?.min ?? 0
  const max = options?.max ?? 100

  // ECharts' gauge axisLine.lineStyle.color takes [fraction, color] stops,
  // where fraction is 0-1 across the whole min-max range -- not the band's
  // own absolute threshold value. Bands are user-facing in absolute terms
  // (e.g. "70" on a 0-100 gauge), so convert here, sorting first since
  // ECharts requires ascending stops to render correctly.
  const colorBands = options?.colorBands
  const axisLineColor = colorBands && colorBands.length > 0
    ? R.pipe(
        colorBands,
        R.sortBy(band => band.threshold),
        R.map((band): [number, string] => [
          Math.min(1, Math.max(0, (band.threshold - min) / (max - min))),
          band.color,
        ]),
      )
    : undefined

  const seriesItem: GaugeSeriesOption = {
    type: 'gauge',
    min: min,
    max: max,
    ...(axisLineColor
      ? { axisLine: { lineStyle: { color: axisLineColor } } }
      : {}),
    progress: {
      show: true,
    },
    detail: {
      valueAnimation: true,
      formatter: '{value}',
    },
    data: [
      {
        value: total,
        name: options?.yAxisLabel ?? valueProp,
      },
    ],
  }

  return {
    series: [seriesItem],
    tooltip: {
      formatter: '{a} <br/>{b} : {c}',
    },
  }
}
