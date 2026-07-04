import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { FunnelSeriesOption } from 'echarts'

describe(
  'Transformer: Funnel',
  () => {
    it(
      'should transform data into basic funnel series',
      () => {
        const data = [
          { name: 'Step 1',
            value: 100 },
          { name: 'Step 2',
            value: 80 },
          { name: 'Step 3',
            value: 60 },
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'funnel',
        )

        expect(option.series).toBeDefined()
        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }
        expect(option.series).toHaveLength(1)

        const series = option.series[0] as FunnelSeriesOption
        expect(series.type).toBe('funnel')

        const seriesData = series.data as { name?: string, value?: number }[] | undefined
        expect(seriesData).toBeDefined()
        if (!seriesData) {
          return
        }
        expect(seriesData).toHaveLength(3)
        // Order should be sorted descending by value, which it already is in the input
        expect(seriesData[0]?.name).toBe('Step 1')
        expect(seriesData[0]?.value).toBe(100)
      },
    )

    it(
      'should sort series by value descending',
      () => {
        const data = [
          { name: 'Step 3',
            value: 60 },
          { name: 'Step 1',
            value: 100 },
          { name: 'Step 2',
            value: 80 },
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'funnel',
        )

        if (!Array.isArray(option.series)) {
          return
        }

        const series = option.series[0] as FunnelSeriesOption
        const seriesData = series.data as { name?: string, value?: number }[] | undefined
        expect(seriesData).toBeDefined()
        if (!seriesData) {
          return
        }

        expect(seriesData).toHaveLength(3)
        expect(seriesData[0]?.name).toBe('Step 1')
        expect(seriesData[0]?.value).toBe(100)
        expect(seriesData[1]?.name).toBe('Step 2')
        expect(seriesData[1]?.value).toBe(80)
        expect(seriesData[2]?.name).toBe('Step 3')
        expect(seriesData[2]?.value).toBe(60)
      },
    )

    it(
      'should handle missing/null names as \'Unknown\'',
      () => {
        const data = [
          { value: 100 }, // missing name
          { name: null,
            value: 50 },
          { name: undefined,
            value: 25 },
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'funnel',
        )

        if (!Array.isArray(option.series)) {
          return
        }

        const series = option.series[0] as FunnelSeriesOption
        const seriesData = series.data as { name?: string, value?: number }[] | undefined
        expect(seriesData).toBeDefined()
        if (!seriesData) {
          return
        }

        // All three rows fall back to name 'Unknown', so they aggregate into
        // a single stage rather than three separate 'Unknown' segments.
        expect(seriesData).toHaveLength(1)
        expect(seriesData[0]?.name).toBe('Unknown')
        expect(seriesData[0]?.value).toBe(175)
      },
    )

    it(
      'should aggregate duplicate categories by summing their values',
      () => {
        const data = [
          { name: 'Visit',
            value: 100 },
          { name: 'Visit',
            value: 100 },
          { name: 'Visit',
            value: 100 },
          { name: 'Cart',
            value: 50 },
          { name: 'Purchase',
            value: 10 },
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'funnel',
        )

        if (!Array.isArray(option.series)) {
          return
        }

        const series = option.series[0] as FunnelSeriesOption
        const seriesData = series.data as { name?: string, value?: number }[] | undefined
        expect(seriesData).toBeDefined()
        if (!seriesData) {
          return
        }

        expect(seriesData).toHaveLength(3)
        expect(seriesData[0]).toEqual({ name: 'Visit',
          value: 300 })
        expect(seriesData[1]).toEqual({ name: 'Cart',
          value: 50 })
        expect(seriesData[2]).toEqual({ name: 'Purchase',
          value: 10 })
      },
    )

    it(
      'should coerce NaN values to 0',
      () => {
        const data = [
          { name: 'Valid',
            value: 100 },
          { name: 'Invalid String',
            value: 'not-a-number' },
          { name: 'Missing Value' },
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'funnel',
        )

        if (!Array.isArray(option.series)) {
          return
        }

        const series = option.series[0] as FunnelSeriesOption
        const seriesData = series.data as { name?: string, value?: number }[] | undefined
        expect(seriesData).toBeDefined()
        if (!seriesData) {
          return
        }

        expect(seriesData).toHaveLength(3)

        // Since it's sorted descending, 'Valid' (100) will be first, followed by the two 0s
        expect(seriesData[0]?.name).toBe('Valid')
        expect(seriesData[0]?.value).toBe(100)

        // The NaN values should be coerced to 0
        expect(seriesData[1]?.value).toBe(0)
        expect(seriesData[2]?.value).toBe(0)
      },
    )

    it(
      'should handle empty data',
      () => {
        const data: readonly Readonly<Record<string, unknown>>[] = []

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'funnel',
        )

        if (!Array.isArray(option.series)) {
          return
        }

        const series = option.series[0] as FunnelSeriesOption
        const seriesData = series.data as { name?: string, value?: number }[] | undefined
        expect(seriesData).toBeDefined()
        if (!seriesData) {
          return
        }

        expect(seriesData).toHaveLength(0)
      },
    )

    it(
      'should include legend when showLegend is true',
      () => {
        const data = [
          { name: 'Step 1',
            value: 100 },
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'funnel',
          { legend: true },
        )

        expect(option.legend).toBeDefined()
        // The return of getLegendOption has properties like orient, type, left/right/top/bottom
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(option.legend.type).toBe('scroll')
      },
    )
  },
)
