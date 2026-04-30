import { describe, it, expect } from 'bun:test'
import type { CandlestickSeriesOption } from 'echarts'
import { transformDataToChartOption } from '../src/charts/transformer'

describe(
  'Transformer - Candlestick Chart',
  () => {
    const data = [
      { date: '2023-10-01',
        open: 100,
        close: 110,
        low: 95,
        high: 115 },
      { date: '2023-10-02',
        open: 110,
        close: 105,
        low: 100,
        high: 112 },
      { date: '2023-10-03',
        open: 105,
        close: 120,
        low: 105,
        high: 125 },
    ]

    it(
      'should create candlestick chart options correctly',
      () => {
        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'candlestick',
          {
            openProp: 'open',
            closeProp: 'close',
            lowProp: 'low',
            highProp: 'high',
          },
        )

        // Basic Structure
        expect(option).toHaveProperty('series')

        const series = option.series as readonly CandlestickSeriesOption[]
        expect(Array.isArray(series)).toBe(true)
        expect(series.length).toBe(1)
        expect(series[0]!.type).toBe('candlestick')

        // Data Verification (using Dataset)
        // Check dataset presence
        expect(option.dataset).toBeDefined()
        expect(Array.isArray(option.dataset)).toBe(true)
        expect(option.dataset).not.toHaveLength(0)
        if (!option.dataset || !Array.isArray(option.dataset) || option.dataset.length === 0) {
          // Fails the test implicitly if reached, or handled by expect above
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataset = option.dataset as readonly { readonly source: readonly any[] }[]
        const source = dataset[0]!.source

        expect(source).toHaveLength(3)
        // Normalized data structure
        expect(source[0]).toEqual({ x: '2023-10-01',
          open: 100,
          close: 110,
          low: 95,
          high: 115 })

        // Encode Verification
        expect(series[0]!.encode).toEqual({
          x: 'x',
          y: ['open',
            'close',
            'low',
            'high'],
        })

        // Axis Verification
        expect(option.xAxis).toBeDefined()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((option.xAxis as any).data).toEqual(['2023-10-01',
          '2023-10-02',
          '2023-10-03'])
      },
    )

    it(
      'should handle missing values gracefully',
      () => {
        const messyData = [
          { date: '2023-10-01',
            open: 100,
            close: 110,
            low: 95,
            high: 115 },
          { date: '2023-10-02',
            open: null,
            close: 105,
            low: 100,
            high: 112 }, // Missing Open
          { date: '2023-10-03',
            open: 105,
            close: 120,
            low: undefined,
            high: 125 }, // Missing Low
        ]

        const option = transformDataToChartOption(
          messyData,
          'date',
          '',
          'candlestick',
          {
            openProp: 'open',
            closeProp: 'close',
            lowProp: 'low',
            highProp: 'high',
          },
        )

        expect(option.dataset).toBeDefined()
        expect(Array.isArray(option.dataset)).toBe(true)
        expect(option.dataset).not.toHaveLength(0)
        expect(option.dataset).not.toHaveLength(0)

        if (!option.dataset || !Array.isArray(option.dataset) || option.dataset.length === 0) {
          return
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataset = option.dataset as readonly { readonly source: readonly any[] }[]
        const source = dataset[0]!.source

        // Should ignore invalid rows (open: null and low: undefined should cause rows to be skipped)
        expect(source).toHaveLength(1)
        expect(source[0]).toEqual({ x: '2023-10-01',
          open: 100,
          close: 110,
          low: 95,
          high: 115 })

        // Check xAxis data sync
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((option.xAxis as any).data).toEqual(['2023-10-01'])
      },
    )

    it(
      'should use default property names if options are missing',
      () => {
        // Data using default names: 'open', 'close', 'low', 'high' (which matches the test data above)
        // We pass empty options for props
        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'candlestick',
        )

        expect(option.dataset).toBeDefined()
        expect(Array.isArray(option.dataset)).toBe(true)

        if (!option.dataset || !Array.isArray(option.dataset) || option.dataset.length === 0) {
          return
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataset = option.dataset as readonly { readonly source: readonly any[] }[]
        const source = dataset[0]!.source

        expect(source).toHaveLength(3)
        expect(source[0]).toEqual({ x: '2023-10-01',
          open: 100,
          close: 110,
          low: 95,
          high: 115 })
      },
    )
  },
)
