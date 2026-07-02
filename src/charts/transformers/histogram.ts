import type { EChartsOption, BarSeriesOption } from 'echarts'
import * as R from 'remeda'
import type { BasesData, BaseTransformerOptions } from './base'
import { getLegendOption, getNestedValue } from './utils'

export interface HistogramTransformerOptions extends BaseTransformerOptions {
  readonly binCount?: number
  readonly binWidth?: number
}

export function createHistogramChartOption(
  data: BasesData,
  valueProp: string,
  options?: HistogramTransformerOptions,
): EChartsOption {
  // 1. Extract and filter valid numeric values
  // Number(...) coercion is required: Bases' note.get() returns a wrapper
  // object (e.g. `{ icon, data: 60 }`) for numeric properties, not a raw
  // number — it does support numeric coercion via its own valueOf(), but
  // `typeof` on the wrapper itself is always 'object'. null/undefined are
  // filtered before coercion since Number(null) is 0, not NaN.
  const values = R.pipe(
    data,
    R.map(row => getNestedValue(
      row,
      valueProp,
    )),
    R.filter(v => v !== null && v !== undefined),
    R.map(Number),
    R.filter((v): v is number => !Number.isNaN(v)),
  )

  const n = values.length

  // 2. Calculate Min/Max
  const sortedValues = R.sortBy(
    values,
    v => v,
  )
  const min = R.first(sortedValues) ?? 0
  const max = R.last(sortedValues) ?? 0
  const rangeVal = max - min
  const safeRange = rangeVal === 0 ? 1 : rangeVal

  // 3. Determine Bin Count/Width
  // Precedence: binWidth > binCount > Sturges
  const sturges = Math.ceil(Math.log2(n) + 1)
  const defaultBinCount = Math.max(
    1,
    options?.binCount ?? sturges,
  )

  // Use ternary instead of if block
  const hasBinWidth = (options?.binWidth ?? 0) > 0
  const binCountFromWidth = hasBinWidth
    ? Math.max(
        1,
        Math.ceil(safeRange / (options?.binWidth ?? 1)),
      )
    : defaultBinCount

  const finalBinWidth = hasBinWidth
    ? (options?.binWidth ?? 1)
    : safeRange / defaultBinCount

  // 5. Generate Bins and Count
  const bins = R.pipe(
    R.range(
      0,
      binCountFromWidth,
    ),
    R.map((i) => {
      const binMin = min + (i * finalBinWidth)
      const binMax = min + ((i + 1) * finalBinWidth)
      const isLast = i === binCountFromWidth - 1

      // Filter values in this bin
      const count = R.pipe(
        values,
        R.filter(v =>
          isLast
            ? (v >= binMin && v <= binMax)
            : (v >= binMin && v < binMax)),
        vals => vals.length,
      )

      const label = `${binMin.toFixed(2)} - ${binMax.toFixed(2)}`

      return { label,
        count }
    }),
  )

  const xAxisData = R.map(
    bins,
    b => b.label,
  )
  const seriesData = R.map(
    bins,
    b => b.count,
  )

  const series: BarSeriesOption = {
    name: options?.yAxisLabel ?? 'Frequency',
    type: 'bar',
    barCategoryGap: 0,
    large: true,
    data: seriesData,
    itemStyle: {
      color: '#5470c6',
    },
  }

  const chartOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
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
      data: xAxisData,
      name: options?.xAxisLabel,
      axisLabel: {
        rotate: options?.xAxisLabelRotate ?? 0,
      },
      axisTick: {
        alignWithLabel: true,
      },
    },
    yAxis: {
      type: 'value',
      name: options?.yAxisLabel ?? 'Frequency',
    },
    series: [series],
  }

  return n === 0 ? {} : chartOption
}
