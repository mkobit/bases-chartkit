import type { EChartsOption, PieSeriesOption, DatasetComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption } from './utils'
import * as R from 'remeda'

export interface PieTransformerOptions extends BaseTransformerOptions {
  readonly roseType?: 'radius' | 'area'
}

interface PieDataPoint {
  readonly name: string
  readonly value: number
}

export function createPieChartOption(
  data: BasesData,
  nameProp: string,
  valueProp: string,
  options?: PieTransformerOptions,
): EChartsOption {
  // 1. Normalize Data for Dataset, aggregating rows that share a name
  // so duplicate categories sum into a single slice instead of one per row.
  // Structure: { name, value }
  const normalizedData: ReadonlyArray<PieDataPoint> = R.pipe(
    data,
    R.map((item): PieDataPoint => {
      const valRaw = getNestedValue(
        item,
        nameProp,
      )
      const name = valRaw === undefined || valRaw === null ? 'Unknown' : safeToString(valRaw)

      const val = Number(getNestedValue(
        item,
        valueProp,
      ))
      return {
        name: name,
        value: Number.isNaN(val) ? 0 : val,
      }
    }),
    R.groupBy(d => d.name),
    R.entries(),
    R.map(([name, items]): PieDataPoint => ({
      name,
      value: R.sumBy(items, d => d.value),
    })),
  )

  const dataset: DatasetComponentOption = {

    source: normalizedData,
  }

  const seriesItem: PieSeriesOption = {
    type: 'pie',
    datasetIndex: 0,
    encode: {
      itemName: 'name',
      value: 'value',
    },
    radius: options?.roseType
      ? [20,
          '75%']
      : '50%',
    ...(options?.roseType ? { roseType: options.roseType } : {}),
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
      },
    },
  }

  const opt: EChartsOption = {
    dataset: [dataset],
    series: [seriesItem],
    tooltip: {
      trigger: 'item',
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }

  return opt
}
