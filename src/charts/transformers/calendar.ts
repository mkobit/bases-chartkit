import type { EChartsOption, CalendarComponentOption, HeatmapSeriesOption, VisualMapComponentOption, TooltipComponentFormatterCallbackParams } from 'echarts'
import * as R from 'remeda'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, safeToString } from './bases-values'
import { formatCompactVisualMapLabel } from './visual-map'
import { DEFAULT_SEQUENTIAL_COLOR_GRADIENT } from './palette'

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
          // Daily activity is a magnitude, so default to the shared sequential
          // single-hue blue ramp (light = low, dark = high) instead of ECharts'
          // built-in blue->green->red rainbow visualMap, which encoded
          // magnitude as hue and read as unordered. A view can still override
          // the ramp via visualMapColor (see the CustomColor variant).
          inRange: {
            color: options?.visualMapColor && options.visualMapColor.length > 0
              ? [...options.visualMapColor]
              : [...DEFAULT_SEQUENTIAL_COLOR_GRADIENT],
          },
        }

        return {
          tooltip: {
            position: 'top',
            formatter: (params: TooltipComponentFormatterCallbackParams) => {
              const item = Array.isArray(params) ? params[0] : params
              const val = item?.value
              return (!val || !Array.isArray(val))
                ? ''
                : `${String(val[0])} : ${String(val[1])}`
            },
          },
          visualMap: visualMapOption,
          calendar: calendarItem,
          series: [seriesItem],
        }
      })()
}
