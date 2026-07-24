import type { EChartsOption, BoxplotSeriesOption } from 'echarts'
// @ts-expect-error ECharts extension imports can be tricky with type definitions
import prepareBoxplotData from 'echarts/extension/dataTool/prepareBoxplotData'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption, isRecord } from './utils'
import * as R from 'remeda'

export interface BoxplotTransformerOptions extends BaseTransformerOptions {
  readonly seriesProp?: string
}

interface BoxplotResult {
  boxData: number[][]
}

function isBoxplotResult(data: unknown): data is BoxplotResult {
  return (
    isRecord(data)
    && 'boxData' in data
    && Array.isArray(data['boxData'])
  )
}

export function createBoxplotChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  options?: BoxplotTransformerOptions,
): EChartsOption {
  const seriesProp = options?.seriesProp
  const xAxisLabel = options?.xAxisLabel ?? xProp
  const yAxisLabel = options?.yAxisLabel ?? yProp

  // 1. Collect all unique X values (categories)
  const xAxisData = R.pipe(
    data,
    R.map((item) => {
      const xValRaw = getNestedValue(
        item,
        xProp,
      )
      return xValRaw === undefined || xValRaw === null ? 'Unknown' : safeToString(xValRaw)
    }),
    R.unique(),
  )

  // 2. Group data by series and category
  // Map<SeriesName, Map<CategoryName, number[]>>
  const seriesMap = R.pipe(
    data,
    R.groupBy((item) => {
      return !seriesProp
        ? yAxisLabel
        : (() => {
            const sRaw = getNestedValue(
              item,
              seriesProp,
            )
            return sRaw === undefined || sRaw === null ? 'Unknown' : safeToString(sRaw)
          })()
    }),
    R.mapValues((items) => {
      return R.pipe(
        items,
        R.groupBy((item) => {
          const xValRaw = getNestedValue(
            item,
            xProp,
          )
          return xValRaw === undefined || xValRaw === null ? 'Unknown' : safeToString(xValRaw)
        }),
        R.mapValues((catItems) => {
          return R.pipe(
            catItems,
            R.map(item => Number(getNestedValue(
              item,
              yProp,
            ))),
            R.filter(val => !Number.isNaN(val)),
          )
        }),
      )
    }),
  )

  // 3. Transform to ECharts series
  const seriesOptions: BoxplotSeriesOption[] = R.pipe(
    seriesMap,
    R.entries(),
    R.map(([sName,
      catMap]) => {
      // Prepare data for prepareBoxplotData
      // We need a 2D array where each row is a category's data points
      const rawData = xAxisData.map(xVal => catMap[xVal] || [])

      // Use standard ECharts data tool to process the data
      // prepareBoxplotData expects [ [v1, v2...], [v3, v4...] ] where each inner array is a category

      const result: unknown = prepareBoxplotData(rawData)

      // ECharts' boxplot defaultOption hardcodes itemStyle.color to an
      // opaque white design token (no dark-theme override exists), while
      // leaving borderColor unset so it still resolves per-series from the
      // active color palette. An explicit transparent fill keeps that
      // palette-colored outline as the only visible box style, which reads
      // correctly in both light and dark themes without duplicating the
      // white block on a near-black background.
      const itemStyle = { color: 'transparent' }

      return !isBoxplotResult(result)
        ? {
            name: sName,
            type: 'boxplot' as const,
            data: [],
            itemStyle,
          }
        : {
            name: sName,
            type: 'boxplot' as const,
            data: result.boxData,
            itemStyle,
          }
    }),
  )

  const opt: EChartsOption = {
    tooltip: {
      trigger: 'item',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      name: xAxisLabel,
      boundaryGap: true,
      splitArea: {
        show: false,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      splitArea: {
        show: true,
      },
    },
    series: seriesOptions,
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }
  return opt
}
