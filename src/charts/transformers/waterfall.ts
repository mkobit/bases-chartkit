import type { EChartsOption, BarSeriesOption } from 'echarts'
import * as R from 'remeda'
import type { BaseTransformerOptions, BasesData } from './base'
import { getAxisLabelOverlapOptions } from './axis-labels'
import { getNestedValue, safeToString } from './bases-values'
import { getCartesianGridOption } from './grid'
import { getLegendOption } from './legend'
import { COLOR_TOKENS, STYLE_TOKENS } from './tokens'
import { OBSIDIAN_AUTO_THEME_NAME } from '../obsidian-theme'

export interface WaterfallTransformerOptions extends BaseTransformerOptions {
  // Property whose truthy value marks a row as an absolute total (bck-h0b):
  // that bar is drawn from 0 to its own value rather than stacked on the
  // running delta sum, and the running sum resets to it. Opt-in -- when unset,
  // every row is a delta exactly as before.
  readonly totalProp?: string
}

interface WaterfallDataPoint {
  readonly name: string
  readonly value: number
  readonly isTotal: boolean
}

// Neutral connector/total colors chosen per theme so the dashed link lines and
// the total bars stay legible on both light and dark Obsidian backgrounds.
const connectorColor = (isDarkMode: boolean): string =>
  isDarkMode ? COLOR_TOKENS.chrome.connectors.dark : COLOR_TOKENS.chrome.connectors.light
const totalBarColor = (isDarkMode: boolean): string =>
  isDarkMode ? COLOR_TOKENS.chrome.totalBar.dark : COLOR_TOKENS.chrome.totalBar.light

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
  const totalProp = options?.totalProp
  const isDarkMode = options?.isDarkMode ?? false
  const hasCustomTheme = Boolean(options?.theme)
    && options?.theme !== 'default'
    && options?.theme !== 'dark'
    && options?.theme !== OBSIDIAN_AUTO_THEME_NAME
  const isMobile = options?.isMobile ?? false
  const containerWidth = options?.containerWidth ?? 1000
  const isCompact = isMobile || containerWidth < 600

  const validData: readonly WaterfallDataPoint[] = R.pipe(
    data,
    R.map((item) => {
      const xVal = getNestedValue(
        item,
        xProp,
      )
      const yVal = getNestedValue(
        item,
        yProp,
      )
      // Bases hands property values back as Value wrappers, not raw JS
      // primitives, so a boolean checkbox property is not `=== true`. Coerce
      // through safeToString (which renders a wrapper via its toString) and
      // compare the text -- covers a raw boolean, the string "true", and a
      // wrapped boolean Value alike.
      const totalRaw = totalProp ? getNestedValue(item, totalProp) : undefined
      const isTotal = safeToString(totalRaw).trim().toLowerCase() === 'true'

      return (xVal === null || xVal === undefined || yVal === null || yVal === undefined || yVal === '')
        ? null
        : { xVal,
            yVal,
            isTotal }
    }),
    R.map((item) => {
      if (item === null) {
        return null
      }
      const name = safeToString(item.xVal)
      const val = Number(item.yVal)
      return (!name || Number.isNaN(val))
        ? null
        : { name,
            value: val,
            isTotal: item.isTotal }
    }),
    R.filter((x): x is WaterfallDataPoint => x !== null),
  )

  interface Accumulator {
    readonly baseData: readonly (number | string)[]
    readonly riseData: readonly (number | string)[]
    readonly fallData: readonly (number | string)[]
    readonly totalData: readonly (number | string)[]
    readonly xData: readonly string[]
    // Running sum after each row -- the y-height at which the connector line to
    // the next bar sits (bck-h0b).
    readonly sums: readonly number[]
    readonly currentSum: number
  }

  const result: Accumulator = validData.reduce<Accumulator>(
    (acc, point) => {
      const { value, name, isTotal } = point
      const prevSum = acc.currentSum

      // An absolute total resets the running baseline to its own value and is
      // drawn from 0 -- never stacked on the accumulated deltas.
      const nextSum = isTotal ? value : prevSum + value

      const isRising = value >= 0
      const baseVal = isTotal ? 0 : (isRising ? prevSum : nextSum)
      const riseVal = (!isTotal && isRising) ? value : '-'
      const fallVal = (!isTotal && !isRising) ? Math.abs(value) : '-'
      const totalVal = isTotal ? value : '-'

      return {
        baseData: [...acc.baseData,
          baseVal],
        riseData: [...acc.riseData,
          riseVal],
        fallData: [...acc.fallData,
          fallVal],
        totalData: [...acc.totalData,
          totalVal],
        xData: [...acc.xData,
          name],
        sums: [...acc.sums,
          nextSum],
        currentSum: nextSum,
      }
    },
    {
      baseData: [],
      riseData: [],
      fallData: [],
      totalData: [],
      xData: [],
      sums: [],
      currentSum: 0,
    },
  )

  const { baseData, riseData, fallData, totalData, xData, sums } = result

  const hasTotals = totalData.some(v => v !== '-')

  // One dashed horizontal segment per adjacent pair, at the running-sum
  // boundary they share -- the end of bar i and the start of bar i+1 are both
  // at sums[i], so the connector is flat. Numeric x-coords index the category
  // axis (ECharts resolves a number on a category axis to its data index).
  // Typed off BarSeriesOption's own markLine.data so the paired-endpoint tuple
  // form is checked structurally without a cast.
  type ConnectorPair = NonNullable<NonNullable<BarSeriesOption['markLine']>['data']>[number]
  const connectorData: ReadonlyArray<ConnectorPair>
    = sums.slice(0, -1).map((sum, i): ConnectorPair => [
      { coord: [i, sum] },
      { coord: [i + 1, sum] },
    ])

  const baseSeries: BarSeriesOption = {
    name: '_base',
    type: 'bar',
    stack: 'total',
    itemStyle: {
      borderColor: COLOR_TOKENS.chrome.transparent,
      color: COLOR_TOKENS.chrome.transparent,
    },
    emphasis: {
      itemStyle: {
        borderColor: COLOR_TOKENS.chrome.transparent,
        color: COLOR_TOKENS.chrome.transparent,
      },
    },
    data: [...baseData],
    tooltip: { show: false },
    silent: true,
    ...(connectorData.length > 0
      ? {
          markLine: {
            symbol: ['none',
              'none'],
            silent: true,
            label: { show: false },
            lineStyle: {
              color: connectorColor(isDarkMode),
              type: 'dashed',
              width: STYLE_TOKENS.strokeWidth.thin,
            },
            data: [...connectorData],
          },
        }
      : {}),
  }

  const {
    interval: xAxisInterval,
    rotate: xAxisRotate,
    hideOverlap: xAxisHideOverlap,
  } = getAxisLabelOverlapOptions(
    xData.length,
    isCompact,
    options?.xAxisLabelRotate,
    false,
    {
      labels: xData,
      containerWidth,
    },
  )

  const insideBarLabel: Pick<BarSeriesOption, 'label' | 'labelLayout'> = {
    label: {
      show: true,
      position: 'inside',
    },
    // Suppress inside labels when a bar is shorter or narrower than the text
    // so small deltas (e.g. -8 or -2) do not overlap thin bars and connectors.
    labelLayout: (params): Readonly<{ readonly fontSize?: number }> => (
      params.rect.height < params.labelRect.height + 4 || params.rect.width < params.labelRect.width
        ? { fontSize: 0 }
        : {}
    ),
  }

  const totalSeries: readonly BarSeriesOption[] = hasTotals
    ? [{
        name: 'Total',
        type: 'bar',
        stack: 'total',
        ...insideBarLabel,
        data: [...totalData],
        ...(hasCustomTheme ? {} : { itemStyle: { color: totalBarColor(isDarkMode) } }),
      }]
    : []

  const series: readonly BarSeriesOption[] = [
    baseSeries,
    {
      name: 'Increase',
      type: 'bar',
      stack: 'total',
      ...insideBarLabel,
      data: [...riseData],
      ...(hasCustomTheme ? {} : { itemStyle: { color: options?.upColor ?? COLOR_TOKENS.status.up } }),
    },
    {
      name: 'Decrease',
      type: 'bar',
      stack: 'total',
      ...insideBarLabel,
      data: [...fallData],
      ...(hasCustomTheme ? {} : { itemStyle: { color: options?.downColor ?? COLOR_TOKENS.status.down } }),
    },
    ...totalSeries,
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
        const pList: readonly TooltipParam[] = params

        const firstParam = pList[0]
        if (!firstParam) {
          return ''
        }

        const name = firstParam.name ?? ''

        const totalParam = pList.find(p => p.seriesName === 'Total')
        if (totalParam && totalParam.value !== '-' && totalParam.value !== undefined) {
          const totalColor = hasCustomTheme
            ? (totalParam.color ?? totalBarColor(isDarkMode))
            : totalBarColor(isDarkMode)
          return `${name}<br/>Total: <span style="color:${totalColor}">${Number(totalParam.value)}</span>`
        }

        const riseParam = pList.find(p => p.seriesName === 'Increase')
        const fallParam = pList.find(p => p.seriesName === 'Decrease')

        const isRising = riseParam && riseParam.value !== '-'

        const value = isRising
          ? Number(riseParam?.value)
          : (fallParam && fallParam.value !== '-' ? -Number(fallParam.value) : 0)

        const type = isRising ? 'Increase' : 'Decrease'
        const activeParam = isRising ? riseParam : fallParam
        const defaultColor = isRising
          ? (options?.upColor ?? COLOR_TOKENS.status.up)
          : (options?.downColor ?? COLOR_TOKENS.status.down)
        const color = hasCustomTheme ? (activeParam?.color ?? defaultColor) : defaultColor
        const displayValue = isRising ? value : -Math.abs(value)

        return `${name}<br/>${type}: <span style="color:${color}">${displayValue}</span>`
      },
    },
    legend: getLegendOption(options),
    grid: getCartesianGridOption(options),
    xAxis: {
      type: 'category',
      data: [...xData],
      name: xAxisLabel,
      axisLabel: {
        rotate: xAxisRotate,
        interval: xAxisInterval,
        hideOverlap: xAxisHideOverlap,
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
    },
    series: [...series],
  }
}
