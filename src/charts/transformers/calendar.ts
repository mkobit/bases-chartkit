import type { EChartsOption, CalendarComponentOption, HeatmapSeriesOption, VisualMapComponentOption } from 'echarts'
import { Temporal } from 'temporal-polyfill'
import * as R from 'remeda'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue } from './utils'

export interface CalendarTransformerOptions extends BaseTransformerOptions {
  readonly valueProp?: string
}

function asCalendarTooltipParams(params: unknown): Readonly<{ value: readonly (number | string)[] }> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
  return params as any
}

export function createCalendarChartOption(
  data: BasesData,
  dateProp: string,
  options?: CalendarTransformerOptions,
): EChartsOption {
  const valueProp = options?.valueProp

  const calendarData = R.pipe(
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
    R.filter((d): d is Readonly<{ date: string
      value: number }> => d !== null),
  )

  return calendarData.length === 0
    ? (() => {
        // Return default empty state
        const minDate = Temporal.Now.plainDateISO().toString()
        return {
          calendar: { range: [minDate,
            minDate] },
          series: [],
        }
      })()
    : (() => {
        // Sort data by date for range calculation and predictable order
        const sortedData = R.sortBy(
          calendarData,
          d => d.date,
        )
        // @ts-expect-error - suppress strictNullChecks/type errors
        const minDate = sortedData[0].date
        // @ts-expect-error - suppress strictNullChecks/type errors
        const maxDate = sortedData[sortedData.length - 1].date

        // Calculate min/max values in one pass using reduce
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

        // ECharts expects [date, value] array
        const seriesData = R.map(
          sortedData,
          d => [d.date,
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
          data: seriesData,
        }

        const visualMapOption: VisualMapComponentOption = {
          min: minVal,
          max: maxVal,
          calculable: true,
          orient: options?.visualMapOrient ?? 'horizontal',
          left: options?.visualMapLeft ?? 'center',
          top: options?.visualMapTop ?? 65,
          type: options?.visualMapType ?? 'continuous',
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
