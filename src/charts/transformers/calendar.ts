import type { EChartsOption, CalendarComponentOption, HeatmapSeriesOption, VisualMapComponentOption } from 'echarts'
import { Temporal } from 'temporal-polyfill'
import * as R from 'remeda'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, formatCompactVisualMapLabel } from './utils'

export interface CalendarTransformerOptions extends BaseTransformerOptions {
  readonly valueProp?: string
}

interface CalendarPoint {
  readonly date: string
  readonly value: number
}

// ECharts heatmap data values are `[date, value]` pairs and must stay mutable
// arrays (echarts' HeatmapDataValue = OptionDataValue[]). The `Mutable` prefix
// opts this out of `type-declaration-immutability`; the `Option` suffix opts it
// out of `prefer-immutable-types` (which exempts echarts option types via
// `ignoreTypePattern`).
type MutableCalendarHeatmapValueOption = (string | number)[]

function asCalendarTooltipParams(params: unknown): Readonly<{ value: readonly (number | string)[] }> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- ECharts tooltip formatter callback params are typed as a wide union; bridge to the shape this chart's tooltip actually receives.
  return params as Readonly<{ value: readonly (number | string)[] }>
}

export function createCalendarChartOption(
  data: BasesData,
  dateProp: string,
  options?: CalendarTransformerOptions,
): EChartsOption {
  const valueProp = options?.valueProp

  const calendarData: ReadonlyArray<CalendarPoint> = R.pipe(
    data,
    R.map((item) => {
      const dateRaw = getNestedValue(
        item,
        dateProp,
      )
      const dateVal = safeToString(dateRaw)

      return !dateVal
        ? null
        : (() => {
            const val = valueProp
              ? Number(getNestedValue(
                  item,
                  valueProp,
                ))
              : Number.NaN
            const finalVal = Number.isNaN(val) ? 0 : val
            return { date: dateVal,
              value: finalVal }
          })()
    }),
    R.filter((d): d is CalendarPoint => d !== null),
  )

  return calendarData.length === 0
    ? (() => {
        const minDate = Temporal.Now.plainDateISO().toString()
        return {
          calendar: { range: [minDate,
            minDate] },
          series: [],
        }
      })()
    : (() => {
        const sortedData: ReadonlyArray<CalendarPoint> = R.sortBy(
          calendarData,
          d => d.date,
        )
        // @ts-expect-error - suppress strictNullChecks/type errors
        const minDate = sortedData[0].date
        // @ts-expect-error - suppress strictNullChecks/type errors
        const maxDate = sortedData[sortedData.length - 1].date

        const range = sortedData.reduce(
          (acc, d) => ({
            min: Math.min(
              acc.min,
              d.value,
            ),
            max: Math.max(
              acc.max,
              d.value,
            ),
          }),
          { min: Infinity,
            max: -Infinity },
        )

        const dataMin = range.min === Infinity ? 0 : range.min
        const dataMax = range.max === -Infinity ? 10 : range.max

        const minVal = options?.visualMapMin !== undefined ? options.visualMapMin : dataMin
        const maxVal = options?.visualMapMax !== undefined ? options.visualMapMax : dataMax

        // ECharts expects [date, value] pairs.
        const seriesData: ReadonlyArray<MutableCalendarHeatmapValueOption> = R.map(
          sortedData,
          (d): MutableCalendarHeatmapValueOption => [d.date,
            d.value],
        )

        const calendarItem: CalendarComponentOption = {
          top: 120,
          // ECharts forces cellSize's width back to 'auto' whenever both
          // `left` and `right` are set (they imply a fixed total width,
          // which conflicts with a fixed per-cell width) - see
          // mergeAndNormalizeLayoutParams/sizeCalculable in echarts'
          // CalendarModel. Setting only `left` lets our explicit cellSize
          // stick, so day cells render as small GitHub-style squares
          // instead of stretching to fill the container (which, for a
          // short date range, collapses into a few wide solid bands).
          left: 30,
          cellSize: [13,
            13],
          range: [minDate,
            maxDate],
          itemStyle: {
            borderWidth: 0.5,
          },
          yearLabel: { show: false },
        }

        const seriesItem: HeatmapSeriesOption = {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: [...seriesData],
        }

        const visualMapOption: VisualMapComponentOption = {
          min: minVal,
          max: maxVal,
          calculable: true,
          orient: options?.visualMapOrient ?? 'horizontal',
          left: options?.visualMapLeft ?? 'center',
          top: options?.visualMapTop ?? 65,
          type: options?.visualMapType ?? 'continuous',
          formatter: formatCompactVisualMapLabel,
          ...(options?.visualMapColor ? { inRange: { color: options.visualMapColor } } : {}),
        }

        return {
          tooltip: {
            position: 'top',
            formatter: (params: unknown) => {
              const p = asCalendarTooltipParams(params)
              return (!p || !Array.isArray(p.value))
                ? ''
                : `${p.value[0]} : ${p.value[1]}`
            },
          },
          visualMap: visualMapOption,
          calendar: calendarItem,
          series: [seriesItem],
        }
      })()
}
