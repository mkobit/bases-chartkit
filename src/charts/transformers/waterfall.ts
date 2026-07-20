import type { EChartsOption, BarSeriesOption } from 'echarts'
import * as R from 'remeda'
import type { BaseTransformerOptions, BasesData } from './base'
import { getLegendOption, getNestedValue, safeToString } from './utils'

export type WaterfallTransformerOptions = BaseTransformerOptions

interface WaterfallDataPoint {
  readonly name: string
  readonly value: number
}

interface TooltipParam {
  readonly seriesName?: string
  readonly value?: number | string
  readonly name?: string
  readonly marker?: string
  readonly color?: string
}

export function createWaterfallChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  options?: WaterfallTransformerOptions,
): EChartsOption {
  const xAxisLabel = options?.xAxisLabel ?? xProp
  const yAxisLabel = options?.yAxisLabel ?? yProp
  const xAxisRotate = options?.xAxisLabelRotate ?? 0

  // 1. Extract and Validate Data
  const validData: readonly WaterfallDataPoint[] = R.pipe(
    data,
    items => items.map((item) => {
      const xVal = getNestedValue(
        item,
        xProp,
      )
      const yVal = getNestedValue(
        item,
        yProp,
      )

      return (xVal === null || xVal === undefined || yVal === null || yVal === undefined || yVal === '')
        ? null
        : { xVal,
            yVal }
    }),
    items => items.map((item) => {
      if (item === null) {
        return null
      }
      const name = safeToString(item.xVal)
      const val = Number(item.yVal)
      return (!name || Number.isNaN(val))
        ? null
        : { name,
            value: val }
    }),
    R.filter((x): x is WaterfallDataPoint => x !== null),
  )

  // 2. Calculate Waterfall Steps
  interface Accumulator {
    readonly baseData: (number | string)[]
    readonly riseData: (number | string)[]
    readonly fallData: (number | string)[]
    readonly xData: string[]
    readonly currentSum: number
  }

  const result: Accumulator = validData.reduce<Accumulator>(
    (acc, point) => {
      const { value, name } = point
      const prevSum = acc.currentSum
      const nextSum = prevSum + value

      const isRising = value >= 0
      const baseVal = isRising ? prevSum : nextSum
      const riseVal = isRising ? value : '-'
      const fallVal = isRising ? '-' : Math.abs(value)

      return {
        baseData: [...acc.baseData,
          baseVal],
        riseData: [...acc.riseData,
          riseVal],
        fallData: [...acc.fallData,
          fallVal],
        xData: [...acc.xData,
          name],
        currentSum: nextSum,
      }
    },
    {
      baseData: [],
      riseData: [],
      fallData: [],
      xData: [],
      currentSum: 0,
    },
  )

  const { baseData, riseData, fallData, xData } = result

  // 3. Construct Series
  const series: BarSeriesOption[] = [
    {
      name: '_base',
      type: 'bar',
      stack: 'total',
      itemStyle: {
        borderColor: 'transparent',
        color: 'transparent',
      },
      emphasis: {
        itemStyle: {
          borderColor: 'transparent',
          color: 'transparent',
        },
      },
      data: baseData,
      tooltip: { show: false },
      silent: true,
    },
    {
      name: 'Increase',
      type: 'bar',
      stack: 'total',
      label: {
        show: true,
        position: 'inside',
      },
      data: riseData,
      itemStyle: {
        color: options?.upColor ?? '#14b143',
      },
    },
    {
      name: 'Decrease',
      type: 'bar',
      stack: 'total',
      label: {
        show: true,
        position: 'inside',
      },
      data: fallData,
      itemStyle: {
        color: options?.downColor ?? '#ef232a',
      },
    },
  ]

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: unknown) => {
        if (!Array.isArray(params)) {
          return ''
        }
        // Array.isArray narrows to any[]; annotate (not assert) to recover the concrete element type ECharts actually passes.
        const pList: TooltipParam[] = params

        const firstParam = pList[0]
        if (!firstParam) {
          return ''
        }

        const name = firstParam.name ?? ''

        const riseParam = pList.find(p => p.seriesName === 'Increase')
        const fallParam = pList.find(p => p.seriesName === 'Decrease')

        const isRising = riseParam && riseParam.value !== '-'

        const value = isRising
          ? Number(riseParam?.value)
          : (fallParam && fallParam.value !== '-' ? -Number(fallParam.value) : 0)

        const type = isRising ? 'Increase' : 'Decrease'
        const color = isRising ? (options?.upColor ?? '#14b143') : (options?.downColor ?? '#ef232a')
        const displayValue = isRising ? value : -Math.abs(value)

        return `${name}<br/>${type}: <span style="color:${color}">${displayValue}</span>`
      },
    },
    legend: getLegendOption(options),
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xData,
      name: xAxisLabel,
      axisLabel: {
        rotate: xAxisRotate,
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
    },
    series: series,
  }
}
