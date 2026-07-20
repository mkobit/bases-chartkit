import { describe, it, expect } from 'bun:test'
import { createWaterfallChartOption } from '../../../src/charts/transformers/waterfall'

describe(
  'createWaterfallChartOption',
  () => {
    const data = [
      { category: 'A',
        value: 100 },
      { category: 'B',
        value: -20 },
      { category: 'C',
        value: 30 },
      { category: 'D',
        value: -10 },
    ]

    it(
      'should create a valid waterfall chart option with base, increase, and decrease series',
      () => {
        const option = createWaterfallChartOption(
          data,
          'category',
          'value',
        )

        expect(option).toBeDefined()

        // Check X Axis
        expect(option.xAxis).toBeDefined()
        const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
        expect(xAxis).toBeDefined()

        expect((xAxis as any).data).toEqual(['A',
          'B',
          'C',
          'D'])

        // Check Series
        expect(option.series).toBeDefined()
        const series = option.series as any[]
        expect(series).toHaveLength(3)

        const baseSeries = series.find(s => s.name === '_base')
        const increaseSeries = series.find(s => s.name === 'Increase')
        const decreaseSeries = series.find(s => s.name === 'Decrease')

        expect(baseSeries).toBeDefined()
        expect(increaseSeries).toBeDefined()
        expect(decreaseSeries).toBeDefined()

        // Check Base Data (Accumulated)
        expect(baseSeries.data).toEqual([0,
          80,
          80,
          100])

        // Check Increase Data
        expect(increaseSeries.data).toEqual([100,
          '-',
          30,
          '-'])

        // Check Decrease Data
        expect(decreaseSeries.data).toEqual(['-',
          20,
          '-',
          10])

        // Check Styling
        expect(baseSeries.itemStyle.color).toBe('transparent')
        expect(increaseSeries.itemStyle.color).toBe('#14b143')
        expect(decreaseSeries.itemStyle.color).toBe('#ef232a')
      },
    )

    it(
      'should handle string values and filter invalid data',
      () => {
        const dirtyData = [
          { category: 'A',
            value: '100' },
          { category: 'B',
            value: null }, // Invalid
          { category: 'C',
            value: '-50' },
        ]

        const option = createWaterfallChartOption(
          dirtyData,
          'category',
          'value',
        )

        expect(option.xAxis).toBeDefined()
        const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
        expect(xAxis).toBeDefined()

        expect((xAxis as any).data).toEqual(['A',
          'C'])

        const series = option.series as any[]
        const baseSeries = series.find(s => s.name === '_base')

        expect(baseSeries.data).toEqual([0,
          50])
      },
    )

    it(
      'should return empty option if data is empty',
      () => {
        const option = createWaterfallChartOption(
          [],
          'category',
          'value',
        )
        expect(option.series).toBeDefined()
        expect((option.series as any[])[0].data).toHaveLength(0)
      },
    )
  },
)
