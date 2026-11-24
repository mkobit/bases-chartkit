import type { EChartsOption, DatasetComponentOption, BarSeriesOption, CustomSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { extractRowMetadata, getNestedValue, safeToString } from './bases-values'
import { getAxisLabelOverlapOptions } from './axis-labels'
import { getCartesianGridOption } from './grid'
import { getLegendOption } from './legend'
import { COLOR_TOKENS, STYLE_TOKENS } from './tokens'
import * as R from 'remeda'

export interface BulletTransformerOptions extends BaseTransformerOptions {
  readonly targetProp?: string
  readonly targetLabel?: string
  readonly rangeLowProp?: string
  readonly rangeMidProp?: string
  readonly rangeHighProp?: string
}

type BulletDataPoint = {
  readonly x: string
  readonly y: number | null
  readonly t: number | null
  readonly r1: number
  readonly r2: number
  readonly r3: number
  readonly rowIndex: number
  readonly filePath?: string
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
  const isMobile = options?.isMobile ?? false
  const containerWidth = options?.containerWidth
  const isCompact = isMobile || (containerWidth !== undefined && containerWidth < 600)

  const normalizedData: ReadonlyArray<BulletDataPoint> = R.map(
    data,
    (item, index): BulletDataPoint => {
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
      const meta = extractRowMetadata(item, index)

      return {
        x: catVal === undefined || catVal === null ? 'Unknown' : safeToString(catVal),
        y: Number.isNaN(valVal) ? null : valVal,
        t: targetVal !== undefined && !Number.isNaN(targetVal) ? targetVal : null,
        r1: s1,
        r2: s2,
        r3: s3,
        rowIndex: meta.rowIndex,
        ...(meta.filePath !== undefined ? { filePath: meta.filePath } : {}),
      }
    },
  )

  const categories: readonly string[] = R.pipe(
    normalizedData,
    R.map(d => d.x),
    R.unique(),
  )

  const dataset: DatasetComponentOption = {
    source: [...normalizedData],
  }

  const hasRanges = Boolean(rangeLowProp || rangeMidProp || rangeHighProp)
  const isDarkMode = options?.isDarkMode ?? false
  // Light-mode bands run light-to-mid-gray against a light/transparent chart
  // background; dark-mode bands run dark-to-mid-gray against ECharts' dark
  // theme background (~#040810) so they stay visible without turning into a
  // stark light-gray box on near-black.
  const rangeColors: Readonly<{ low: string
    mid: string
    high: string }> = isDarkMode
    ? COLOR_TOKENS.chrome.bulletRanges.dark
    : COLOR_TOKENS.chrome.bulletRanges.light

  const createRangeSeries = (key: 'r1' | 'r2' | 'r3', color: string): BarSeriesOption => ({
    type: 'bar',
    stack: 'range',
    ...(flipAxis ? { yAxisIndex: 1 } : { xAxisIndex: 1 }),
    silent: true,
    barWidth: STYLE_TOKENS.barWidth.bulletRange,
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

  const rangeSeries: ReadonlyArray<BarSeriesOption> = hasRanges
    ? [
        createRangeSeries(
          'r1',
          rangeColors.low,
        ),
        createRangeSeries(
          'r2',
          rangeColors.mid,
        ),
        createRangeSeries(
          'r3',
          rangeColors.high,
        ),
      ]
    : []

  const barSeries: BarSeriesOption = {
    name: yAxisLabel,
    type: 'bar',
    ...(hasRanges
      ? (flipAxis ? { yAxisIndex: 0 } : { xAxisIndex: 0 })
      : {}),
    encode: flipAxis
      ? { x: 'y',
          y: 'x' }
      : { x: 'x',
          y: 'y' },
    barWidth: hasRanges ? STYLE_TOKENS.barWidth.bulletValue : STYLE_TOKENS.barWidth.bulletSoloValue,
    z: 2,
  }

  const targetColor = isDarkMode
    ? COLOR_TOKENS.chrome.targetMarker.dark
    : COLOR_TOKENS.chrome.targetMarker.light
  const targetSpanRatio = hasRanges ? 0.65 : 0.75
  const targetThickness = 4

  const targetSeries: CustomSeriesOption = {
    name: options?.targetLabel ?? 'Target',
    type: 'custom',
    ...(hasRanges
      ? (flipAxis ? { yAxisIndex: 0 } : { xAxisIndex: 0 })
      : {}),
    encode: flipAxis
      ? { x: 't',
          y: 'x' }
      : { x: 'x',
          y: 't' },
    z: 3,
    color: targetColor,
    renderItem: (params, api) => {
      const encode = params.encode
      const xDim = encode?.x?.[0] ?? 0
      const yDim = encode?.y?.[0] ?? 1
      const xVal = api.value(xDim)
      const yVal = api.value(yDim)
      const targetVal = flipAxis ? xVal : yVal
      if (targetVal === null || targetVal === undefined || Number.isNaN(Number(targetVal))) {
        return null
      }
      const [cx = 0, cy = 0] = api.coord([xVal, yVal])
      const bandSize = api.size?.(flipAxis ? [0, 1] : [1, 0])
      const bandWidth = (Array.isArray(bandSize)
        ? (flipAxis ? bandSize[1] : bandSize[0])
        : bandSize) ?? 0
      const span = bandWidth * targetSpanRatio
      return {
        type: 'rect',
        shape: flipAxis
          ? {
              x: cx - targetThickness / 2,
              y: cy - span / 2,
              width: targetThickness,
              height: span,
            }
          : {
              x: cx - span / 2,
              y: cy - targetThickness / 2,
              width: span,
              height: targetThickness,
            },
        style: {
          fill: targetColor,
        },
      }
    },
  }

  const {
    interval: xAxisInterval,
    rotate: xAxisRotate,
    hideOverlap: xAxisHideOverlap,
  } = getAxisLabelOverlapOptions(
    categories.length,
    isCompact,
    options?.xAxisLabelRotate,
    flipAxis,
    {
      labels: categories,
      containerWidth,
    },
  )

  const categoryAxisOption = {
    type: 'category' as const,
    data: [...categories],
    name: xAxisLabel,
    axisLabel: {
      rotate: xAxisRotate,
      interval: xAxisInterval,
      hideOverlap: xAxisHideOverlap,
    },
  }

  const hiddenCategoryAxisOption = {
    type: 'category' as const,
    data: [...categories],
    show: false,
  }

  const valueAxisOption = {
    type: 'value' as const,
    name: yAxisLabel,
    ...(flipAxis ? { axisLabel: { hideOverlap: xAxisHideOverlap } } : {}),
  }

  const series: ReadonlyArray<BarSeriesOption | CustomSeriesOption> = [
    ...rangeSeries,
    barSeries,
    ...(targetProp ? [targetSeries] : []),
  ]

  return {
    dataset: [dataset],
    tooltip: { trigger: 'axis' },
    xAxis: flipAxis
      ? valueAxisOption
      : (hasRanges ? [categoryAxisOption, hiddenCategoryAxisOption] : categoryAxisOption),
    yAxis: flipAxis
      ? (hasRanges ? [categoryAxisOption, hiddenCategoryAxisOption] : categoryAxisOption)
      : valueAxisOption,
    series: [...series],
    grid: getCartesianGridOption(options),
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }
}
