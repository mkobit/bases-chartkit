import { describe, it, expect } from 'bun:test'
import { createThemeRiverChartOption } from '../../../src/charts/transformers/theme-river'
import type { EChartsOption, ThemeRiverSeriesOption } from 'echarts'

// EChartsOption['series'] is a `type`-discriminated union; filtering on the
// literal `type` narrows each element to ThemeRiverSeriesOption -- no cast.
function themeRiverSeries(option: EChartsOption): readonly ThemeRiverSeriesOption[] {
  const list = Array.isArray(option.series) ? option.series : []
  return list.flatMap(s => s.type === 'themeRiver' ? [s] : [])
}

// ThemeRiver series data are [date, value, theme] tuples typed loosely by
// ECharts; a runtime Array check narrows them to indexable rows, no cast.
function themeRiverRows(option: EChartsOption): readonly (readonly unknown[])[] {
  const data = themeRiverSeries(option)[0]?.data
  return Array.isArray(data) ? data.flatMap(row => Array.isArray(row) ? [row] : []) : []
}

describe(
  'createThemeRiverChartOption',
  () => {
    const data = [
      { date: '2023-01-01',
        mentions: 10,
        topic: 'Tech' },
      { date: '2023-01-01',
        mentions: 5,
        topic: 'Politics' },
      { date: '2023-01-02',
        mentions: 8,
        topic: 'Tech' },
    ]

    it(
      'should build sorted [date, value, theme] tuples keyed by themeProp',
      () => {
        const option = createThemeRiverChartOption(
          data,
          'date',
          { valueProp: 'mentions',
            themeProp: 'topic' },
        )

        const series = themeRiverSeries(option)
        expect(series).toHaveLength(1)
        expect(series[0]?.data).toEqual([
          ['2023-01-01', 10, 'Tech'],
          ['2023-01-01', 5, 'Politics'],
          ['2023-01-02', 8, 'Tech'],
        ])
      },
    )

    it(
      'should default missing/non-numeric values to 0',
      () => {
        const option = createThemeRiverChartOption(
          [{ date: '2023-01-01',
            topic: 'Tech' }],
          'date',
          { themeProp: 'topic' },
        )

        const item = themeRiverRows(option)[0]
        expect(item?.[1]).toBe(0)
      },
    )

    it(
      'should filter out rows with no parseable date',
      () => {
        const option = createThemeRiverChartOption(
          [...data, { date: null, mentions: 1, topic: 'Tech' }],
          'date',
          { valueProp: 'mentions',
            themeProp: 'topic' },
        )

        const series = themeRiverSeries(option)
        expect(series[0]?.data).toHaveLength(3)
      },
    )

    it(
      'should drop rows whose date property is not actually a parseable date, instead of handing ECharts a garbage time-axis value',
      () => {
        // Reproduces the bug: safeToString(dateRaw) happily turned any
        // truthy non-date string into a "date" for the time axis (e.g.
        // "not-a-date"), which ECharts can't parse and which broke the
        // chart with no diagnostic. Temporal-based parsing correctly
        // rejects it instead.
        const option = createThemeRiverChartOption(
          [...data, { date: 'not-a-date', mentions: 1, topic: 'Tech' }],
          'date',
          { valueProp: 'mentions',
            themeProp: 'topic' },
        )

        const series = themeRiverSeries(option)
        expect(series[0]?.data).toHaveLength(3)
      },
    )

    it(
      'should accept an ISO instant string, not just a plain date, for the date property',
      () => {
        const option = createThemeRiverChartOption(
          [{ date: '2023-01-01T12:00:00Z', mentions: 1, topic: 'Tech' }],
          'date',
          { valueProp: 'mentions',
            themeProp: 'topic' },
        )

        expect(themeRiverRows(option)[0]?.[0]).toBe('2023-01-01')
      },
    )

    it(
      'should fall back to the value field\'s label, not a hardcoded \'Series 1\', when themeProp is unset',
      () => {
        const option = createThemeRiverChartOption(
          data,
          'date',
          { valueProp: 'mentions' },
        )

        const themes = themeRiverRows(option).map(row => row[2])
        expect(themes.every(t => t === 'mentions')).toBe(true)
      },
    )

    it(
      'should emit a title/subtext when title and description options are set, for first-read explainability',
      () => {
        const option = createThemeRiverChartOption(
          data,
          'date',
          { valueProp: 'mentions',
            themeProp: 'topic',
            title: 'News topics over time',
            description: 'Band thickness is mention count.' },
        )

        const title = Array.isArray(option.title) ? option.title[0] : option.title
        expect(title?.text).toBe('News topics over time')
        expect(title?.subtext).toBe('Band thickness is mention count.')
      },
    )

    it(
      'should omit the title when neither title nor description is set',
      () => {
        const option = createThemeRiverChartOption(
          data,
          'date',
          { valueProp: 'mentions',
            themeProp: 'topic' },
        )

        expect(option.title).toBeUndefined()
      },
    )

    it(
      'should default to a horizontal single time axis',
      () => {
        const option = createThemeRiverChartOption(
          data,
          'date',
          { valueProp: 'mentions',
            themeProp: 'topic' },
        )

        const singleAxis = Array.isArray(option.singleAxis) ? option.singleAxis[0] : option.singleAxis
        expect(singleAxis?.orient).toBe('horizontal')
        expect(singleAxis?.type).toBe('time')
      },
    )

    it(
      'should pivot to a vertical single axis when flipAxis is set',
      () => {
        const option = createThemeRiverChartOption(
          data,
          'date',
          { valueProp: 'mentions',
            themeProp: 'topic',
            flipAxis: true },
        )

        const singleAxis = Array.isArray(option.singleAxis) ? option.singleAxis[0] : option.singleAxis
        expect(singleAxis?.orient).toBe('vertical')
      },
    )
  },
)
