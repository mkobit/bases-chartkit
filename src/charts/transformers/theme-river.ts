import type { EChartsOption, ThemeRiverSeriesOption } from 'echarts'
import { Temporal } from 'temporal-polyfill'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption, parseDateToEpochMs } from './utils'
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
  // ECharts' ThemerRiverDataItem is a mutable [date, value, name] tuple, so
  // this is a genuine mutable boundary -- prefer-immutable-types is masked for
  // src/**/*.ts and can't be satisfied without gaming the tuple's typing.
  return items.map(d => [d.date,
    d.value,
    d.theme])
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

  const seriesItem: ThemeRiverSeriesOption = {
    type: 'themeRiver',
    data: asThemeRiverData(riverData),
    emphasis: {
      itemStyle: {
        shadowBlur: 20,
        shadowColor: 'rgba(0, 0, 0, 0.8)',
      },
    },
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: 'rgba(0,0,0,0.2)',
          width: 1,
          type: 'solid',
        },
      },
    },
    singleAxis: {
      type: 'time',
      boundaryGap: [0,
        0],
    },
    series: [seriesItem],
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }
}
