import type { EChartsOption, GaugeSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue } from './utils'
import * as R from 'remeda'

export type GaugeAggregation = 'sum' | 'avg' | 'min' | 'max' | 'last'

export interface GaugeTransformerOptions extends BaseTransformerOptions {
  readonly min?: number
  readonly max?: number
  readonly aggregation?: GaugeAggregation
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

  const seriesItem: GaugeSeriesOption = {
    type: 'gauge',
    min: min,
    max: max,
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
