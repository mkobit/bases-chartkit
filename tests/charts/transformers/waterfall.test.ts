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

    it(
      'draws a connector markLine at each running-sum boundary between adjacent bars',
      () => {
        // Running sums after A/B/C/D = 100 / 80 / 110 / 100.
        const option = createWaterfallChartOption(
          data,
          'category',
          'value',
        )
        const series = option.series as any[]
        const baseSeries = series.find(s => s.name === '_base')

        // One connector per adjacent pair (n-1), each a flat segment at the
        // shared boundary height, spanning the two category indices.
        expect(baseSeries.markLine.data).toEqual([
          [{ coord: [0, 100] }, { coord: [1, 100] }],
          [{ coord: [1, 80] }, { coord: [2, 80] }],
          [{ coord: [2, 110] }, { coord: [3, 110] }],
        ])
        expect(baseSeries.markLine.silent).toBe(true)
      },
    )

    it(
      'does not add a Total series when no totalProp is configured',
      () => {
        const option = createWaterfallChartOption(
          data,
          'category',
          'value',
        )
        const series = option.series as any[]
        expect(series.find(s => s.name === 'Total')).toBeUndefined()
        expect(series).toHaveLength(3)
      },
    )

    it(
      'renders totalProp-flagged rows as absolute bars from zero and resets the running sum',
      () => {
        const totalData = [
          { category: 'Start',
            value: 1000,
            total: true },
          { category: 'Up',
            value: 200,
            total: false },
          { category: 'Down',
            value: -50,
            total: false },
          { category: 'End',
            value: 1150,
            total: true },
        ]

        const option = createWaterfallChartOption(
          totalData,
          'category',
          'value',
          { totalProp: 'total' },
        )
        const series = option.series as any[]
        const baseSeries = series.find(s => s.name === '_base')
        const increaseSeries = series.find(s => s.name === 'Increase')
        const decreaseSeries = series.find(s => s.name === 'Decrease')
        const totalSeries = series.find(s => s.name === 'Total')

        expect(totalSeries).toBeDefined()
        // Total bars sit at index 0 and 3, drawn from a zero base.
        expect(totalSeries.data).toEqual([1000, '-', '-', 1150])
        expect(baseSeries.data).toEqual([0, 1000, 1150, 0])
        // Deltas stack on the reset baseline: Up rises from 1000, Down falls to 1150.
        expect(increaseSeries.data).toEqual(['-', 200, '-', '-'])
        expect(decreaseSeries.data).toEqual(['-', '-', 50, '-'])
        // Connectors follow the reset sums: 1000 -> 1200 -> 1150 -> 1150.
        expect(baseSeries.markLine.data).toEqual([
          [{ coord: [0, 1000] }, { coord: [1, 1000] }],
          [{ coord: [1, 1200] }, { coord: [2, 1200] }],
          [{ coord: [2, 1150] }, { coord: [3, 1150] }],
        ])
      },
    )

    it(
      'treats the string "true" as a total flag',
      () => {
        const option = createWaterfallChartOption(
          [{ category: 'A',
            value: 42,
            total: 'true' }],
          'category',
          'value',
          { totalProp: 'total' },
        )
        const series = option.series as any[]
        const totalSeries = series.find(s => s.name === 'Total')
        expect(totalSeries.data).toEqual([42])
      },
    )
  },
)
