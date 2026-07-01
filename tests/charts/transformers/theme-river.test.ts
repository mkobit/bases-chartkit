import { describe, it, expect } from 'bun:test'
import { createThemeRiverChartOption } from '../../../src/charts/transformers/theme-river'
import type { ThemeRiverSeriesOption } from 'echarts'

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

        const series = option.series as ThemeRiverSeriesOption[]
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

        const series = option.series as ThemeRiverSeriesOption[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item = (series[0]?.data as any)[0]
        expect(item[1]).toBe(0)
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

        const series = option.series as ThemeRiverSeriesOption[]
        expect(series[0]?.data).toHaveLength(3)
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

        const series = option.series as ThemeRiverSeriesOption[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const themes = (series[0]?.data as any).map((row: unknown[]) => row[2])
        expect(themes.every((t: string) => t === 'mentions')).toBe(true)
      },
    )
  },
)
