import type { EChartsOption, GaugeSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue } from './utils'

export interface GaugeTransformerOptions extends BaseTransformerOptions {
  readonly min?: number
  readonly max?: number
}

export function createGaugeChartOption(
  data: BasesData,
  valueProp: string,
  options?: GaugeTransformerOptions,
): EChartsOption {
  // Sum all values
  const total = data.reduce(
    (acc, item) => {
      const val = Number(getNestedValue(
        item,
        valueProp,
      ))
      return Number.isNaN(val) ? acc : acc + val
    },
    0,
  )

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
