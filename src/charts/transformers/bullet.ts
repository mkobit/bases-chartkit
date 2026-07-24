import type { EChartsOption, DatasetComponentOption, BarSeriesOption, ScatterSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption } from './utils'
import * as R from 'remeda'

export interface BulletTransformerOptions extends BaseTransformerOptions {
  readonly targetProp?: string
  readonly targetLabel?: string
  readonly rangeLowProp?: string
  readonly rangeMidProp?: string
  readonly rangeHighProp?: string
}

export function createBulletChartOption(
  data: BasesData,
  categoryProp: string,
  valueProp: string,
  options?: BulletTransformerOptions,
): EChartsOption {
  const targetProp = options?.targetProp
  const rangeLowProp = options?.rangeLowProp
  const rangeMidProp = options?.rangeMidProp
  const rangeHighProp = options?.rangeHighProp
  const xAxisLabel = options?.xAxisLabel ?? categoryProp
  const yAxisLabel = options?.yAxisLabel ?? valueProp
  const flipAxis = options?.flipAxis ?? false

  const normalizedData = R.map(
    data,
    (item) => {
      const catVal = getNestedValue(
        item,
        categoryProp,
      )
      const valVal = Number(getNestedValue(
        item,
        valueProp,
      ))
      const targetVal = targetProp
        ? Number(getNestedValue(
            item,
            targetProp,
          ))
        : undefined

      // Range Values
      const r1Raw = (rangeLowProp !== undefined)
        ? Number(getNestedValue(
            item,
            rangeLowProp,
          ))
        : 0
      const r2Raw = (rangeMidProp !== undefined)
        ? Number(getNestedValue(
            item,
            rangeMidProp,
          ))
        : 0
      const r3Raw = (rangeHighProp !== undefined)
        ? Number(getNestedValue(
            item,
            rangeHighProp,
          ))
        : 0

      const r1Safe = !Number.isNaN(r1Raw) ? r1Raw : 0
      const r2Safe = !Number.isNaN(r2Raw) ? r2Raw : 0
      const r3Safe = !Number.isNaN(r3Raw) ? r3Raw : 0

      // Calculate deltas for stacked bars (assuming cumulative inputs)
      const s1 = r1Safe
      const s2 = Math.max(
        0,
        r2Safe - r1Safe,
      )
      const s3 = Math.max(
        0,
        r3Safe - r2Safe,
      )

      return {
        x: catVal === undefined || catVal === null ? 'Unknown' : safeToString(catVal),
        y: Number.isNaN(valVal) ? null : valVal,
        t: targetVal !== undefined && !Number.isNaN(targetVal) ? targetVal : null,
        r1: s1,
        r2: s2,
        r3: s3,
      }
    },
  )

  const categories = R.pipe(
    normalizedData,
    R.map(d => d.x),
    R.unique(),
  )

  const dataset: DatasetComponentOption = {
    source: normalizedData,
  }

  // Range Series (Background)
  const hasRanges = Boolean(rangeLowProp || rangeMidProp || rangeHighProp)
  const isDarkMode = options?.isDarkMode ?? false
  // Light-mode bands run light-to-mid-gray against a light/transparent chart
  // background; dark-mode bands run dark-to-mid-gray against ECharts' dark
  // theme background (~#040810) so they stay visible without turning into a
  // stark light-gray box on near-black.
  const rangeColors = isDarkMode
    ? ['#404040', '#595959', '#737373'] as const
    : ['#e0e0e0', '#bdbdbd', '#9e9e9e'] as const

  const createRangeSeries = (key: 'r1' | 'r2' | 'r3', color: string): BarSeriesOption => ({
    type: 'bar',
    stack: 'range',
    silent: true,
    barWidth: '80%',
    z: 0,
    itemStyle: { color },
    // r1/r2/r3 are stacked *deltas* between the configured range
    // thresholds, not the threshold values themselves — showing them in
    // the tooltip (unnamed or named) is either blank or misleading, so
    // they're excluded like waterfall's invisible "_base" series.
    tooltip: { show: false },
    encode: flipAxis
      ? { x: key,
          y: 'x' }
      : { x: 'x',
          y: key },
    animation: false,
  })

  const rangeSeries: BarSeriesOption[] = hasRanges
    ? [
        createRangeSeries(
          'r1',
          rangeColors[0],
        ),
        createRangeSeries(
          'r2',
          rangeColors[1],
        ),
        createRangeSeries(
          'r3',
          rangeColors[2],
        ),
      ]
    : []

  const barSeries: BarSeriesOption = {
    name: yAxisLabel,
    type: 'bar',
    encode: flipAxis
      ? { x: 'y',
          y: 'x' }
      : { x: 'x',
          y: 'y' },
    barWidth: hasRanges ? '40%' : '60%',
    z: 2,
    ...(hasRanges ? { barGap: '-100%' } : {}),
  }

  const scatterSeries: ScatterSeriesOption = {
    name: options?.targetLabel ?? 'Target',
    type: 'scatter',
    encode: flipAxis
      ? { x: 't',
          y: 'x' }
      : { x: 'x',
          y: 't' },
    symbol: 'rect',
    symbolSize: flipAxis
      ? [4,
          hasRanges ? 30 : 40]
      : [hasRanges ? 30 : 40,
          4],
    z: 3,
    itemStyle: {
      color: isDarkMode ? '#fff' : '#000',
    },
  }

  const series = [
    ...rangeSeries,
    barSeries,
    ...(targetProp ? [scatterSeries] : []),
  ]

  return {
    dataset: [dataset],
    tooltip: { trigger: 'axis' },
    xAxis: flipAxis
      ? { type: 'value',
          name: yAxisLabel }
      : { type: 'category',
          data: categories,
          name: xAxisLabel },
    yAxis: flipAxis
      ? { type: 'category',
          data: categories,
          name: xAxisLabel }
      : { type: 'value',
          name: yAxisLabel },
    series: series,
    grid: {
      containLabel: true,
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }
}
