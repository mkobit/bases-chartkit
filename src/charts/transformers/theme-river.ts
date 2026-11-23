import type { CustomSeriesOption, EChartsOption, SingleAxisComponentOption, ThemeRiverSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, safeToString } from './bases-values'
import { parseDateToEpochMs } from './dates'
import { GRID_TOP_WITH_SUBTITLE_AND_TOP_LEGEND, getLegendOption, hasTopLegendWithSubtitle } from './legend'
import { getTitleOption } from './title'
import { COLOR_TOKENS, STYLE_TOKENS } from './tokens'
import * as R from 'remeda'

export interface ThemeRiverTransformerOptions extends BaseTransformerOptions {
  readonly valueProp?: string
  readonly themeProp?: string
}

// Named-field record for the internal pipeline. ECharts' ThemeRiver wants
// [date, value, id] tuples, but this eslint-plugin version reports readonly
// tuples as Mutable, so model the point with readonly fields here and build
// the tuples at the ECharts assignment boundary below.
interface ThemeRiverItem {
  readonly date: string
  readonly value: number
  readonly theme: string
}

// Build the [date, value, id] tuples ECharts' ThemeRiver expects at the
// series-data boundary, keeping the mutable tuple shape out of the typed
// pipeline above.
function asThemeRiverData(items: readonly ThemeRiverItem[]): ThemeRiverSeriesOption['data'] {
  // ECharts' ThemerRiverDataItem is a mutable [date, value, name] tuple, so this is a genuine mutable boundary.
  // eslint-disable-next-line functional/prefer-immutable-types -- see comment above; can't be satisfied without gaming the tuple's typing.
  return items.map(d => [d.date,
    d.value,
    d.theme])
}

interface Point2D {
  readonly x: number
  readonly y: number
}

interface NormalizedSlice {
  readonly left: number
  readonly right: number
}

const RIVER_SMOOTH = 0.4

// Build smooth cubic Bezier `C` commands along a polyline (Catmull-Rom tension
// matching ECharts' ThemeRiver `smooth: 0.4`), leaving end caps straight.
function smoothCurveSegments(points: readonly Point2D[]): string {
  const n = points.length
  const tension = RIVER_SMOOTH / 2
  return points.slice(0, -1).map((p0, i) => {
    const p1 = points[i + 1] ?? p0
    const prev = i > 0 ? (points[i - 1] ?? p0) : p0
    const next = i + 2 < n ? (points[i + 2] ?? p1) : p1
    const minY = Math.min(p0.y, p1.y)
    const maxY = Math.max(p0.y, p1.y)
    const cp1x = p0.x + (p1.x - prev.x) * tension
    const cp1y = Math.min(maxY, Math.max(minY, p0.y + (p1.y - prev.y) * tension))
    const cp2x = p1.x - (next.x - p0.x) * tension
    const cp2y = Math.min(maxY, Math.max(minY, p1.y - (next.y - p0.y) * tension))
    return `C${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p1.x} ${p1.y}`
  }).join('')
}

function buildVerticalBandPath(
  leftPoints: readonly Point2D[],
  rightPoints: readonly Point2D[],
): string {
  const firstLeft = leftPoints[0]
  const firstRight = rightPoints[0]
  const lastRight = rightPoints.at(-1)
  if (!firstLeft || !firstRight || !lastRight) {
    return ''
  }

  if (leftPoints.length === 1) {
    const halfHeight = 2
    return `M${firstLeft.x} ${firstLeft.y - halfHeight}L${firstRight.x} ${firstRight.y - halfHeight}L${firstRight.x} ${firstRight.y + halfHeight}L${firstLeft.x} ${firstLeft.y + halfHeight}Z`
  }

  const downCurve = smoothCurveSegments(leftPoints)
  const upCurve = smoothCurveSegments(rightPoints.toReversed())
  return `M${firstLeft.x} ${firstLeft.y}${downCurve}L${lastRight.x} ${lastRight.y}${upCurve}Z`
}

function hasRectBounds(coordSys: unknown): coordSys is { readonly x: number, readonly y: number, readonly width: number, readonly height: number } {
  return typeof coordSys === 'object'
    && coordSys !== null
    && 'x' in coordSys && typeof coordSys.x === 'number'
    && 'y' in coordSys && typeof coordSys.y === 'number'
    && 'width' in coordSys && typeof coordSys.width === 'number'
    && 'height' in coordSys && typeof coordSys.height === 'number'
}

interface EpochValue {
  readonly epochMs: number
  readonly value: number
}

// ECharts' CustomSeriesOption['data'] expects mutable [epochMs, value] tuples.
function asCustomSeriesData(rows: readonly EpochValue[]): CustomSeriesOption['data'] {
  // eslint-disable-next-line functional/prefer-immutable-types -- ECharts CustomSeriesOption['data'] requires mutable tuple arrays at the assignment boundary.
  return rows.map(({ epochMs, value }) => [epochMs, value])
}

// ECharts 6's built-in `themeRiver` series hardcodes horizontal x/y coordinates
// in both `themeRiverLayout` and `ThemeRiverView`, collapsing bands to a zero-width
// line when `singleAxis.orient === 'vertical'`. Render each theme as a `custom`
// series on the vertical `singleAxis` instead so bands spread horizontally.
function buildVerticalThemeRiverSeries(riverData: readonly ThemeRiverItem[]): readonly CustomSeriesOption[] {
  if (riverData.length === 0) {
    return []
  }

  const dates: readonly string[] = R.unique(riverData.map(d => d.date))
  const dateEpochs: readonly number[] = dates.map(d => Temporal.PlainDate.from(d).toZonedDateTime('UTC').epochMilliseconds)
  const themes: readonly string[] = R.unique(riverData.map(d => d.theme))

  const valueByKey = R.pipe(
    riverData,
    R.groupBy(d => `${d.date}\0${d.theme}`),
    R.mapValues((items: readonly ThemeRiverItem[]) => R.sumBy(items, x => x.value)),
  )

  const dateTotals: readonly number[] = dates.map(date =>
    R.sumBy(themes, theme => valueByKey[`${date}\0${theme}`] ?? 0),
  )
  const maxTotal = Math.max(...dateTotals, 0)

  const slicesByDate: readonly (readonly NormalizedSlice[])[] = dates.map((date, k) => {
    const total = dateTotals[k] ?? 0
    const baseline = (maxTotal - total) / 2
    return R.reduce(
      themes,
      (acc: { readonly offset: number, readonly slices: readonly NormalizedSlice[] }, theme) => {
        const val = valueByKey[`${date}\0${theme}`] ?? 0
        const left = maxTotal > 0 ? (baseline + acc.offset) / maxTotal : 0.5
        const right = maxTotal > 0 ? (baseline + acc.offset + val) / maxTotal : 0.5
        return {
          offset: acc.offset + val,
          slices: [...acc.slices, { left, right }],
        }
      },
      { offset: 0, slices: [] },
    ).slices
  })

  return themes.map((theme, themeIdx): CustomSeriesOption => ({
    name: theme,
    type: 'custom',
    coordinateSystem: 'singleAxis',
    encode: { single: 0, value: 1 },
    data: asCustomSeriesData(
      dates.map((date, k): EpochValue => ({
        epochMs: dateEpochs[k] ?? 0,
        value: valueByKey[`${date}\0${theme}`] ?? 0,
      })),
    ),
    renderItem: (params, api) => {
      if (params.dataIndex !== 0 || !hasRectBounds(params.coordSys)) {
        return null
      }
      const plotX = params.coordSys.x
      const plotWidth = params.coordSys.width
      const leftPoints: readonly Point2D[] = dateEpochs.map((epochMs, k) => {
        const y = api.coord([epochMs])[1] ?? 0
        const slice = slicesByDate[k]?.[themeIdx]
        return {
          x: plotX + (slice?.left ?? 0.5) * plotWidth,
          y,
        }
      })
      const rightPoints: readonly Point2D[] = dateEpochs.map((epochMs, k) => {
        const y = api.coord([epochMs])[1] ?? 0
        const slice = slicesByDate[k]?.[themeIdx]
        return {
          x: plotX + (slice?.right ?? 0.5) * plotWidth,
          y,
        }
      })
      const pathData = buildVerticalBandPath(leftPoints, rightPoints)
      if (!pathData) {
        return null
      }
      const fill = api.visual('color')
      return {
        type: 'path',
        shape: { pathData },
        style: {
          fill: typeof fill === 'string' ? fill : undefined,
        },
        emphasis: {
          style: {
            shadowBlur: STYLE_TOKENS.shadowBlur.deep,
            shadowColor: COLOR_TOKENS.chrome.shadows.deep,
          },
        },
        textContent: {
          type: 'text',
          style: {
            text: theme,
            fill: COLOR_TOKENS.chrome.labelInk,
            stroke: COLOR_TOKENS.chrome.labelHalo,
            lineWidth: STYLE_TOKENS.strokeWidth.medium,
            fontSize: 11,
          },
        },
        textConfig: { position: 'inside' },
      }
    },
  }))
}

export function createThemeRiverChartOption(
  data: BasesData,
  dateProp: string,
  options?: ThemeRiverTransformerOptions,
): EChartsOption {
  const valueProp = options?.valueProp
  const themeProp = options?.themeProp

  const riverData: readonly ThemeRiverItem[] = R.pipe(
    data,
    R.map((item) => {
      const dateRaw = getNestedValue(
        item,
        dateProp,
      )
      // Parsed via Temporal (AGENTS.md) rather than handed to ECharts'
      // time axis as whatever string safeToString happens to produce --
      // that let non-date values through silently and broke the axis with
      // no diagnostic. Unparseable dates are dropped here instead.
      const epochMs = parseDateToEpochMs(dateRaw)

      return epochMs === null
        ? null
        : (() => {
            const dateVal = Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO('UTC').toPlainDate().toString()
            const valNum = valueProp
              ? Number(getNestedValue(
                  item,
                  valueProp,
                ))
              : Number.NaN
            const val = Number.isNaN(valNum) ? 0 : valNum

            const tRaw = themeProp
              ? getNestedValue(
                  item,
                  themeProp,
                )
              : undefined
            const theme = (tRaw !== undefined && tRaw !== null) ? safeToString(tRaw) : (valueProp ?? 'Value')

            const res: ThemeRiverItem = { date: dateVal,
              value: val,
              theme }
            return res
          })()
    }),
    R.filter((x): x is ThemeRiverItem => x !== null),
    R.sortBy(x => x.date),
  )

  const title = getTitleOption(options)

  // flipAxis pivots the river from the default horizontal time flow (time along
  // the x-axis, bands stacked vertically) to a vertical one (time running top
  // to bottom, bands spreading horizontally) -- the themeRiver analog of a
  // flipped bar chart. `top` reserves room for the title/legend chrome above.
  const flip = options?.flipAxis ?? false
  const singleAxis: SingleAxisComponentOption = {
    type: 'time',
    orient: flip ? 'vertical' : 'horizontal',
    boundaryGap: [0,
      0],
    top: hasTopLegendWithSubtitle(options) ? GRID_TOP_WITH_SUBTITLE_AND_TOP_LEGEND : (title ? 70 : 50),
    bottom: 55,
    ...(flip
      ? { left: 60,
          right: 60,
          position: 'left',
          inverse: true }
      : {}),
  }

  const series: EChartsOption['series'] = flip
    ? [...buildVerticalThemeRiverSeries(riverData)]
    : [{
        type: 'themeRiver',
        data: asThemeRiverData(riverData),
        // Direct-label each band with its topic name so identity never rests on
        // the legend swatch alone -- the river bands are wide enough to carry a
        // short label, and it reads without cross-referencing the legend.
        label: { show: true },
        emphasis: {
          itemStyle: {
            shadowBlur: STYLE_TOKENS.shadowBlur.deep,
            shadowColor: COLOR_TOKENS.chrome.shadows.deep,
          },
        },
      }]

  return {
    ...(title ? { title } : {}),
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: COLOR_TOKENS.chrome.shadows.subtle,
          width: STYLE_TOKENS.strokeWidth.thin,
          type: 'solid',
        },
      },
    },
    singleAxis,
    series,
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }
}
