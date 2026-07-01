import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { BoxplotSeriesOption } from 'echarts'

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

        const series = option.series[0] as BoxplotSeriesOption
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
        const series = option.series[0] as BoxplotSeriesOption

        expect(series.data).toHaveLength(1)
        // Boxplot with 1 value: min=max=q1=q3=median=100
        // Expected data item to be array of 5 numbers
        // @ts-expect-error - suppress strictNullChecks in tests
        const item = series.data[0] as readonly number[]
        expect(item).toEqual([100,
          100,
          100,
          100,
          100])
      },
    )
  },
)
