import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../../../src/charts/transformer'
import { formatCompactVisualMapLabel } from '../../../src/charts/transformers/utils'
import { DEFAULT_SEQUENTIAL_COLOR_GRADIENT } from '../../../src/charts/transformers/palette'
import type { CalendarComponentOption, ContinuousVisualMapComponentOption, EChartsOption, HeatmapSeriesOption, SeriesOption } from 'echarts'

// A calendar series datum is a `[date, value]` pair; ECharts types the series
// data as a wide OptionDataValue union with no discriminant TS can check, so
// this is a genuine runtime shape check rather than an unverified cast.
type CalendarCell = readonly [string, number]

function isCalendarCell(value: unknown): value is CalendarCell {
  return Array.isArray(value) && value.length === 2
    && typeof value[0] === 'string' && typeof value[1] === 'number'
}

function seriesList(option: EChartsOption): readonly SeriesOption[] {
  return Array.isArray(option.series)
    ? option.series
    : option.series === undefined ? [] : [option.series]
}

// EChartsOption['series'] is a `type`-discriminated union, so this needs no
// cast -- checking the literal `type` narrows the element to HeatmapSeriesOption.
function firstHeatmapSeries(option: EChartsOption): HeatmapSeriesOption {
  const series = seriesList(option)[0]
  if (series?.type !== 'heatmap') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a heatmap series, got ${String(series?.type)}`)
  }
  return series
}

function heatmapCells(series: HeatmapSeriesOption): readonly CalendarCell[] {
  const data = series.data
  return Array.isArray(data) ? data.flatMap(cell => isCalendarCell(cell) ? [cell] : []) : []
}

function firstCalendar(option: EChartsOption): CalendarComponentOption {
  const calendar = Array.isArray(option.calendar) ? option.calendar[0] : option.calendar
  if (calendar === undefined) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error('expected a calendar to be defined')
  }
  return calendar
}

// calendar.ts always sets visualMap.type explicitly (defaulting to
// 'continuous' when options.visualMapType is omitted, as in every test below),
// so this checks the real discriminant rather than asserting it.
function firstContinuousVisualMap(option: EChartsOption): ContinuousVisualMapComponentOption {
  const visualMap = Array.isArray(option.visualMap) ? option.visualMap[0] : option.visualMap
  if (visualMap?.type !== 'continuous') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a continuous visualMap, got ${String(visualMap?.type)}`)
  }
  return visualMap
}

describe(
  'Calendar Transformer',
  () => {
    it(
      'should create a valid calendar option',
      () => {
        const data = [
          { date: '2023-01-01',
            val: 5 },
          { date: '2023-01-02',
            val: 10 },
          { date: '2023-02-01',
            val: 20 },
        ]

        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'calendar',
          { valueProp: 'val' },
        )

        expect(option).toBeDefined()

        // Check Calendar Component

        const calendar = firstCalendar(option)
        expect(calendar).toBeDefined()

        expect(calendar.range).toEqual(['2023-01-01',
          '2023-02-01'])

        // ECharts forces cellSize's width back to 'auto' whenever both
        // `left` and `right` are set on the calendar component (see
        // CalendarModel's mergeAndNormalizeLayoutParams/sizeCalculable) -
        // only `left` may be set, or day cells silently stop being fixed
        // squares and stretch to fill the container instead.
        expect(calendar.cellSize).toEqual([13,
          13])
        expect(calendar.right).toBeUndefined()

        // Check Series
        expect(seriesList(option)).toHaveLength(1)
        const series = firstHeatmapSeries(option)

        expect(series.type).toBe('heatmap')

        expect(series.coordinateSystem).toBe('calendar')

        // Check Data

        const seriesData = heatmapCells(series)
        expect(seriesData).toHaveLength(3)
        expect(seriesData[0]).toEqual(['2023-01-01',
          5])
        expect(seriesData[2]).toEqual(['2023-02-01',
          20])
      },
    )

    it(
      'should handle missing values gracefully',
      () => {
        const data = [
          { date: '2023-01-01',
            val: 5 },
          { date: 'invalid-date',
            val: 10 }, // Should be filtered out
          { date: '2023-01-03' }, // Missing val, should be 0 or NaN handled
        ]

        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'calendar',
          { valueProp: 'val' },
        )

        const series = firstHeatmapSeries(option)

        const seriesData = heatmapCells(series)

        // invalid-date should be skipped?
        // Let's check logic:
        // const dateVal = safeToString(dateRaw)
        // return !dateVal ? null : ...
        // If 'invalid-date' is returned as string, it's included.
        // ECharts might complain but transformer includes it if it's a string.
        // Wait, logic is: safeToString returns string.
        // So 'invalid-date' is valid string.
        // But let's check if there is date validation. There isn't in the transformer code I saw.
        // It just passes string.

        // The empty value one:
        // const val = valueProp ? Number(...) : NaN
        // const finalVal = Number.isNaN(val) ? 0 : val
        // So it should be 0.

        const missingValItem = seriesData.find(d => d[0] === '2023-01-03')
        expect(missingValItem).toBeDefined()
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(missingValItem[1]).toBe(0)
      },
    )

    it(
      'should calculate visualMap min/max correctly',
      () => {
        const data = [
          { date: '2023-01-01',
            val: 10 },
          { date: '2023-01-02',
            val: 100 },
        ]

        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'calendar',
          { valueProp: 'val' },
        )

        const visualMap = firstContinuousVisualMap(option)

        expect(visualMap.min).toBe(10)
        expect(visualMap.max).toBe(100)
      },
    )

    it(
      'should abbreviate visualMap handle labels to avoid overlap on large-value axes',
      () => {
        const data = [
          { date: '2023-01-01',
            val: 10 },
          { date: '2023-01-02',
            val: 100 },
        ]

        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'calendar',
          { valueProp: 'val' },
        )

        const visualMap = firstContinuousVisualMap(option)

        expect(visualMap.formatter).toBe(formatCompactVisualMapLabel)
      },
    )

    it(
      'defaults the visualMap ramp to the sequential single-hue gradient when no color override is given',
      () => {
        const data = [
          { date: '2023-01-01',
            val: 10 },
          { date: '2023-01-02',
            val: 100 },
        ]

        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'calendar',
          { valueProp: 'val' },
        )

        const visualMap = firstContinuousVisualMap(option)
        expect(visualMap.inRange?.color).toEqual([...DEFAULT_SEQUENTIAL_COLOR_GRADIENT])
      },
    )

    it(
      'uses the visualMapColor override for the ramp when provided',
      () => {
        const data = [
          { date: '2023-01-01',
            val: 10 },
          { date: '2023-01-02',
            val: 100 },
        ]

        const override = ['#e5f5e0',
          '#a1d99b',
          '#005a32']
        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'calendar',
          { valueProp: 'val',
            visualMapColor: override },
        )

        const visualMap = firstContinuousVisualMap(option)
        expect(visualMap.inRange?.color).toEqual(override)
      },
    )

    it(
      'should handle empty data',
      () => {
        const data: [] = []
        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'calendar',
          { valueProp: 'val' },
        )
        expect(seriesList(option)).toHaveLength(0)
      },
    )
  },
)
