import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { EChartsOption, BoxplotSeriesOption } from 'echarts'

// EChartsOption['series'] is a `type`-discriminated union, so checking the
// literal `type` narrows `series` to BoxplotSeriesOption -- no cast needed.
function firstBoxplotSeries(option: EChartsOption): BoxplotSeriesOption {
  const series = Array.isArray(option.series) ? option.series[0] : option.series
  if (series?.type !== 'boxplot') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a boxplot series, got ${String(series?.type)}`)
  }
  return series
}

describe(
  'Transformer: Boxplot',
  () => {
    it(
      'should transform data into boxplot series',
      () => {
        // Data: Two categories with multiple values
        const data = [
          { cat: 'A',
            val: 10 },
          { cat: 'A',
            val: 20 },
          { cat: 'A',
            val: 30 },
          { cat: 'A',
            val: 40 },
          { cat: 'A',
            val: 50 },
          { cat: 'B',
            val: 1 },
          { cat: 'B',
            val: 2 },
          { cat: 'B',
            val: 3 },
          { cat: 'B',
            val: 4 },
          { cat: 'B',
            val: 5 },
        ]

        const option = transformDataToChartOption(
          data,
          'cat',
          'val',
          'boxplot',
        )

        expect(option.series).toBeDefined()
        // Check if series is an array to narrow type and avoid lint errors
        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }
        expect(option.series).toHaveLength(1)

        const series = firstBoxplotSeries(option)
        expect(series.type).toBe('boxplot')
        expect(series.data).toHaveLength(2) // Two categories

        // X Axis should have categories
        expect(option.xAxis).toBeDefined()
        // @ts-ignore
        expect(option.xAxis.data).toContain('A')
        // @ts-ignore
        expect(option.xAxis.data).toContain('B')

        // Regression: series name and axis titles should reflect the actual
        // fields plotted, not a hardcoded 'Series 1' or a blank axis title.
        expect(series.name).toBe('val')
        // @ts-ignore
        expect(option.xAxis.name).toBe('cat')
        // @ts-ignore
        expect(option.yAxis.name).toBe('val')

        // Regression: ECharts' boxplot default fill is an opaque white with
        // no dark-theme override, so an explicit transparent fill is
        // required to avoid a solid white block on dark backgrounds.
        expect(series.itemStyle).toEqual({ color: 'transparent' })
      },
    )

    it(
      'should handle single value per category (degenerate box)',
      () => {
        const data = [
          { cat: 'C',
            val: 100 },
        ]
        const option = transformDataToChartOption(
          data,
          'cat',
          'val',
          'boxplot',
        )

        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }
        const series = firstBoxplotSeries(option)

        expect(series.data).toHaveLength(1)
        // Boxplot with 1 value: min=max=q1=q3=median=100
        // Expected data item to be array of 5 numbers
        // @ts-expect-error - suppress strictNullChecks in tests
        const item = series.data[0]
        expect(item).toEqual([100,
          100,
          100,
          100,
          100])
      },
    )

    it(
      'should transform grouped multi-series boxplot with transparent itemStyle on every series',
      () => {
        const data = [
          { cat: 'A', group: 'G1', val: 10 },
          { cat: 'A', group: 'G1', val: 20 },
          { cat: 'A', group: 'G1', val: 30 },
          { cat: 'A', group: 'G2', val: 40 },
          { cat: 'A', group: 'G2', val: 50 },
          { cat: 'A', group: 'G2', val: 60 },
          { cat: 'B', group: 'G1', val: 5 },
          { cat: 'B', group: 'G1', val: 15 },
          { cat: 'B', group: 'G1', val: 25 },
          { cat: 'B', group: 'G2', val: 35 },
          { cat: 'B', group: 'G2', val: 45 },
          { cat: 'B', group: 'G2', val: 55 },
        ]

        const option = transformDataToChartOption(
          data,
          'cat',
          'val',
          'boxplot',
          { seriesProp: 'group' },
        )

        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }
        expect(option.series).toHaveLength(2)

        for (const series of option.series) {
          expect(series.type).toBe('boxplot')
          if (series.type !== 'boxplot') {
            continue
          }
          expect(series.itemStyle).toEqual({ color: 'transparent' })
        }

        const seriesNames = option.series.map(s => s.name)
        expect(seriesNames).toContain('G1')
        expect(seriesNames).toContain('G2')
      },
    )
  },
)
