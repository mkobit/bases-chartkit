import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { BarSeriesOption } from 'echarts'

describe(
  'Transformer: Waterfall',
  () => {
    it(
      'should transform basic sequential value data',
      () => {
        const data = [
          { name: 'Step 1',
            value: 100 },
          { name: 'Step 2',
            value: 50 },
          { name: 'Step 3',
            value: 30 },
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'waterfall',
        )

        expect(option.series).toBeDefined()
        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }
        expect(option.series).toHaveLength(3)

        const baseSeries = option.series[0] as BarSeriesOption
        const riseSeries = option.series[1] as BarSeriesOption
        const fallSeries = option.series[2] as BarSeriesOption

        expect(baseSeries.name).toBe('_base')
        expect(riseSeries.name).toBe('Increase')
        expect(fallSeries.name).toBe('Decrease')

        expect(baseSeries.data).toEqual([0,
          100,
          150])
        expect(riseSeries.data).toEqual([100,
          50,
          30])
        expect(fallSeries.data).toEqual(['-',
          '-',
          '-'])

        expect(option.xAxis).toBeDefined()
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(option.xAxis.data).toEqual(['Step 1',
          'Step 2',
          'Step 3'])
      },
    )

    it(
      'should transform mixed positive/negative deltas correctly',
      () => {
        const data = [
          { name: 'Q1',
            value: 100 },
          { name: 'Q2',
            value: -20 },
          { name: 'Q3',
            value: 40 },
          { name: 'Q4',
            value: -50 },
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'waterfall',
        )

        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }

        const baseSeries = option.series[0] as BarSeriesOption
        const riseSeries = option.series[1] as BarSeriesOption
        const fallSeries = option.series[2] as BarSeriesOption

        // Q1: +100 -> base: 0, rise: 100, fall: '-' (sum=100)
        // Q2: -20 -> base: 80, rise: '-', fall: 20 (sum=80)
        // Q3: +40 -> base: 80, rise: 40, fall: '-' (sum=120)
        // Q4: -50 -> base: 70, rise: '-', fall: 50 (sum=70)
        expect(baseSeries.data).toEqual([0,
          80,
          80,
          70])
        expect(riseSeries.data).toEqual([100,
          '-',
          40,
          '-'])
        expect(fallSeries.data).toEqual(['-',
          20,
          '-',
          50])
      },
    )

    it(
      'should handle empty data',
      () => {
        const data: Record<string, unknown>[] = []
        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'waterfall',
        )

        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }

        const baseSeries = option.series[0] as BarSeriesOption
        const riseSeries = option.series[1] as BarSeriesOption
        const fallSeries = option.series[2] as BarSeriesOption

        expect(baseSeries.data).toEqual([])
        expect(riseSeries.data).toEqual([])
        expect(fallSeries.data).toEqual([])

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(option.xAxis.data).toEqual([])
      },
    )

    it(
      'should handle single data point',
      () => {
        const data = [
          { name: 'Single',
            value: 42 },
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'waterfall',
        )

        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }

        const baseSeries = option.series[0] as BarSeriesOption
        const riseSeries = option.series[1] as BarSeriesOption
        const fallSeries = option.series[2] as BarSeriesOption

        expect(baseSeries.data).toEqual([0])
        expect(riseSeries.data).toEqual([42])
        expect(fallSeries.data).toEqual(['-'])

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(option.xAxis.data).toEqual(['Single'])
      },
    )

    it(
      'should handle all-zero data',
      () => {
        const data = [
          { name: 'Z1',
            value: 0 },
          { name: 'Z2',
            value: 0 },
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'waterfall',
        )

        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }

        const baseSeries = option.series[0] as BarSeriesOption
        const riseSeries = option.series[1] as BarSeriesOption
        const fallSeries = option.series[2] as BarSeriesOption

        // 0 >= 0 is true, so isRising is true.
        // base: prevSum (0), rise: 0, fall: '-'
        expect(baseSeries.data).toEqual([0,
          0])
        expect(riseSeries.data).toEqual([0,
          0])
        expect(fallSeries.data).toEqual(['-',
          '-'])
      },
    )

    it(
      'should handle tooltip formatting',
      () => {
        const data = [
          { name: 'Inc',
            value: 100 },
          { name: 'Dec',
            value: -50 },
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'waterfall',
        )

        expect(option.tooltip).toBeDefined()
        // @ts-expect-error - suppress strictNullChecks in tests
        const formatter = option.tooltip.formatter as (params: unknown) => string

        const incResult = formatter([{ name: 'Inc', seriesName: 'Increase', value: 100 }])
        expect(incResult).toContain('Inc<br/>Increase:')
        expect(incResult).toContain('100')

        const decResult = formatter([
          { name: 'Dec', seriesName: 'Increase', value: '-' },
          { name: 'Dec', seriesName: 'Decrease', value: 50 },
        ])
        expect(decResult).toContain('Dec<br/>Decrease:')
        expect(decResult).toContain('-50')
      },
    )
  },
)
