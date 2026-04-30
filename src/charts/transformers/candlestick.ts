import type { EChartsOption, CandlestickSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue } from './utils'
import * as R from 'remeda'

export interface CandlestickTransformerOptions extends BaseTransformerOptions {
  readonly openProp?: string
  readonly closeProp?: string
  readonly lowProp?: string
  readonly highProp?: string
}

export function createCandlestickChartOption(
  data: BasesData,
  xProp: string,
  options?: CandlestickTransformerOptions,
): EChartsOption {
  const openProp = options?.openProp ?? 'open'
  const closeProp = options?.closeProp ?? 'close'
  const lowProp = options?.lowProp ?? 'low'
  const highProp = options?.highProp ?? 'high'
  const xAxisLabel = options?.xAxisLabel ?? xProp
  const xAxisRotate = options?.xAxisLabelRotate ?? 0

  // 1. Normalize Data for Dataset
  // Structure: { x, open, close, low, high }
  const normalizedData = R.pipe(
    data,
    R.map((item) => {
      const xValRaw = getNestedValue(
        item,
        xProp,
      )

      const openRaw = getNestedValue(
        item,
        openProp,
      )
      const closeRaw = getNestedValue(
        item,
        closeProp,
      )
      const lowRaw = getNestedValue(
        item,
        lowProp,
      )
      const highRaw = getNestedValue(
        item,
        highProp,
      )

      // Validation
      const rawValuesValid = openRaw !== null && openRaw !== undefined
        && closeRaw !== null && closeRaw !== undefined
        && lowRaw !== null && lowRaw !== undefined
        && highRaw !== null && highRaw !== undefined

      return rawValuesValid
        ? (() => {
            const openVal = Number(openRaw)
            const closeVal = Number(closeRaw)
            const lowVal = Number(lowRaw)
            const highVal = Number(highRaw)

            const isNum = !Number.isNaN(openVal) && !Number.isNaN(closeVal) && !Number.isNaN(lowVal) && !Number.isNaN(highVal)

            return isNum
              ? {
                  x: xValRaw === undefined || xValRaw === null ? 'Unknown' : safeToString(xValRaw),
                  open: openVal,
                  close: closeVal,
                  low: lowVal,
                  high: highVal,
                }
              : null
          })()
        : null
    }),
    R.filter((x): x is Readonly<{ x: string
      open: number
      close: number
      low: number
      high: number }> => x !== null),
  )

  // 2. Get X Axis Data
  const xAxisData = normalizedData.map(d => d.x)

  // 3. Build Series
  const seriesItem: CandlestickSeriesOption = {
    type: 'candlestick',
    datasetIndex: 0,
    encode: {
      x: 'x',
      y: ['open',
        'close',
        'low',
        'high'],
    },
    itemStyle: {
      color: options?.upColor ?? '#14b143',
      color0: options?.downColor ?? '#ef232a',
      borderColor: options?.upColor ?? '#14b143',
      borderColor0: options?.downColor ?? '#ef232a',
    },
  }

  const opt: EChartsOption = {
    dataset: [{ source: normalizedData }],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      name: xAxisLabel,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      axisLabel: {
        rotate: xAxisRotate,
      },
    },
    yAxis: {
      scale: true,
      splitArea: {
        show: true,
      },
      name: options?.yAxisLabel,
    },
    dataZoom: [
      {
        type: 'inside',
        start: 50,
        end: 100,
      },
      {
        show: true,
        type: 'slider',
        top: '90%',
        start: 50,
        end: 100,
      },
    ],
    series: [seriesItem],
  }

  return opt
}
