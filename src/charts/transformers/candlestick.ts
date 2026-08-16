import type { EChartsOption, CandlestickSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getAxisLabelOverlapOptions, isRecord, asTooltipFormatter } from './utils'
import * as R from 'remeda'

// Bull-green / bear-red, the near-universal candlestick convention. Shared by
// the candle body (itemStyle) and the tooltip's colored change line so the two
// always agree on which direction a day moved.
const DEFAULT_UP_COLOR = '#14b143'
const DEFAULT_DOWN_COLOR = '#ef232a'

export interface CandlestickTransformerOptions extends BaseTransformerOptions {
  readonly openProp?: string
  readonly closeProp?: string
  readonly lowProp?: string
  readonly highProp?: string
}

type CandlestickRow = Readonly<{
  x: string
  open: number
  close: number
  low: number
  high: number
}>

function isCandlestickRow(val: unknown): val is CandlestickRow {
  return isRecord(val) && 'open' in val && 'close' in val && 'low' in val && 'high' in val
}

export interface CandlestickTooltipParam {
  readonly marker?: string
  // See scatter.ts's identical comment: ECharts' CallbackDataParams.value for
  // an object-row dataset source is the WHOLE raw row, not a single scalar.
  // The same object-row shape also means ECharts' default formatter-less
  // tooltip can never label multi-dim values via `dimensions`/`displayName`
  // (its isValueMultipleLine check needs an ARRAY value, confirmed via
  // seriesFormatTooltip.js -- getRawValue() here returns an object instead),
  // so a custom formatter is required to actually show "Open: x" etc.
  readonly value: unknown
}

// Turns the four raw OHLC numbers into the day's story: signed price move and
// percent from open to close, arrow + color matching the candle. This is the
// "i dont know what the hover values mean" fix -- the labels were already there
// (bck-t21), but a Change line is what actually says up-or-down and by how much.
function formatChangeLine(open: number, close: number, upColor: string, downColor: string): string {
  const change = close - open
  const pct = open !== 0 ? (change / open) * 100 : 0
  const up = change >= 0
  const arrow = up ? '▲' : '▼'
  const color = up ? upColor : downColor
  const changeStr = `${up ? '+' : '-'}${Math.abs(change).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  const pctStr = `${up ? '+' : '-'}${Math.abs(pct).toFixed(2)}%`
  return `Change: <span style="color:${color}">${arrow} ${changeStr} (${pctStr})</span>`
}

function formatTooltip(
  params: CandlestickTooltipParam | ReadonlyArray<CandlestickTooltipParam>,
  upColor: string,
  downColor: string,
): string {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Array.isArray narrows to unknown[]; reassert the element type ECharts actually passes
  const p = Array.isArray(params) ? params as ReadonlyArray<CandlestickTooltipParam> : [params] as ReadonlyArray<CandlestickTooltipParam>
  const first = p[0]
  if (!first || !isCandlestickRow(first.value)) {
    return ''
  }
  const row = first.value
  const marker = first.marker ?? ''
  // Conventional Open/High/Low/Close reading order (the "OHLC" acronym), rather
  // than the dataset's own open/close/low/high key order.
  return `${marker}<b>${row.x}</b><br/>`
    + `Open: ${row.open.toLocaleString('en-US')}<br/>`
    + `High: ${row.high.toLocaleString('en-US')}<br/>`
    + `Low: ${row.low.toLocaleString('en-US')}<br/>`
    + `Close: ${row.close.toLocaleString('en-US')}<br/>`
    + formatChangeLine(row.open, row.close, upColor, downColor)
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
  const upColor = options?.upColor ?? DEFAULT_UP_COLOR
  const downColor = options?.downColor ?? DEFAULT_DOWN_COLOR

  const isMobile = options?.isMobile ?? false
  const containerWidth = options?.containerWidth ?? 1000
  const isCompact = isMobile || containerWidth < 600

  const normalizedData: ReadonlyArray<CandlestickRow> = R.pipe(
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
    R.filter((x): x is CandlestickRow => x !== null),
  )

  const xAxisData: readonly string[] = normalizedData.map(d => d.x)

  // A daily series carries 45-75 date categories; even inside the dataZoom
  // window they collide at interval 0. Thin them with the shared helper (same
  // as heatmap). Rotation stays with the cross-cutting bck-i9b.12 concern.
  const { interval: xAxisInterval, rotate: xAxisRotate } = getAxisLabelOverlapOptions(
    xAxisData.length,
    isCompact,
    options?.xAxisLabelRotate,
    false,
  )

  const seriesItem: CandlestickSeriesOption = {
    type: 'candlestick',
    datasetIndex: 0,
    encode: {
      x: 'x',
      y: ['open',
        'close',
        'low',
        'high'],
      // Without this, ECharts' dimension inference locks in `name` from
      // this dataset's own object-row keys (open/close/low/high) before
      // WhiskerBoxCommonMixin's defaultTooltip:true template dims
      // ('open'/'close'/'lowest'/'highest') get a chance to apply -- since
      // that template only fills in defaultTooltip when a dim's name is
      // still unset, none of the 4 OHLC values end up flagged, and ECharts
      // falls back to showing just one value (see
      // node_modules/echarts/lib/data/helper/createDimensions.js's
      // `resultItem.name == null` gate and dimensionHelper.js's
      // defaultedLabel/defaultedTooltip fallback). Declaring the tooltip
      // dims explicitly bypasses that whole detection path.
      tooltip: ['open',
        'close',
        'low',
        'high'],
    },
    itemStyle: {
      color: upColor,
      color0: downColor,
      borderColor: upColor,
      borderColor0: downColor,
    },
  }

  const opt: EChartsOption = {
    dataset: [{
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-restricted-syntax -- normalizedData's row shape varies per chart; ECharts dataset.source just needs plain records.
      source: normalizedData as unknown as Record<string, unknown>[],
    }],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: asTooltipFormatter((params: CandlestickTooltipParam | ReadonlyArray<CandlestickTooltipParam>) => formatTooltip(params, upColor, downColor)),
    },
    xAxis: {
      type: 'category',
      data: [...xAxisData],
      name: xAxisLabel,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      axisLabel: {
        rotate: xAxisRotate,
        interval: xAxisInterval,
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
