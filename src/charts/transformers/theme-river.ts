import type { EChartsOption, ThemeRiverSeriesOption } from 'echarts'
import { Temporal } from 'temporal-polyfill'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption, parseDateToEpochMs } from './utils'
import * as R from 'remeda'

export interface ThemeRiverTransformerOptions extends BaseTransformerOptions {
  readonly valueProp?: string
  readonly themeProp?: string
}

// Define the tuple type explicitly to match usage
// ECharts ThemeRiver expects [date, value, id]
type ThemeRiverItem = [string, number, string]

export function createThemeRiverChartOption(
  data: BasesData,
  dateProp: string,
  options?: ThemeRiverTransformerOptions,
): EChartsOption {
  const valueProp = options?.valueProp
  const themeProp = options?.themeProp

  // Data format: [date, value, themeName]
  const riverData = R.pipe(
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

            // Explicitly type the tuple
            const res: ThemeRiverItem = [dateVal,
              val,
              theme]
            return res
          })()
    }),
    R.filter((x): x is ThemeRiverItem => x !== null),
    R.sortBy(x => x[0]),
  )

  const seriesItem: ThemeRiverSeriesOption = {
    type: 'themeRiver',
    // Pass the properly typed data
    data: riverData,
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
