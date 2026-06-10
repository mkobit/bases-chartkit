import { describe, it, expect } from 'bun:test'
import { createPolarBarChartOption } from '../../src/charts/transformers/polar-bar'
import type { BarSeriesOption } from 'echarts'

describe(
  'Polar Bar Chart Transformer',
  () => {
    const data = [
      { angle: 'A',
        radius: 10,
        series: 'S1' },
      { angle: 'B',
        radius: 20,
        series: 'S1' },
      { angle: 'A',
        radius: 15,
        series: 'S2' },
      { angle: 'B',
        radius: 25,
        series: 'S2' },
    ]

    it(
      'should create basic polar bar chart',
      () => {
        const option = createPolarBarChartOption(
          data,
          'angle',
          'radius',
        )

        expect(option.polar).toBeDefined()
        expect(option.angleAxis).toEqual(expect.objectContaining({
          type: 'category',
          data: ['A',
            'B'],
        }))
        expect(option.radiusAxis).toBeDefined()

        const series = option.series as BarSeriesOption[]
        expect(series).toHaveLength(1)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].type).toBe('bar')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].coordinateSystem).toBe('polar')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].encode).toEqual({ angle: 'x',
          radius: 'y' })
      },
    )

    it(
      'should handle series grouping',
      () => {
        const option = createPolarBarChartOption(
          data,
          'angle',
          'radius',
          { seriesProp: 'series' },
        )

        const series = option.series as BarSeriesOption[]
        expect(series).toHaveLength(2)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].name).toBe('S1')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[1].name).toBe('S2')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].coordinateSystem).toBe('polar')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[1].coordinateSystem).toBe('polar')
      },
    )

    it(
      'should handle stacking',
      () => {
        const option = createPolarBarChartOption(
          data,
          'angle',
          'radius',
          { seriesProp: 'series',
            stack: true },
        )

        const series = option.series as BarSeriesOption[]
        expect(series).toHaveLength(2)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].stack).toBe('total')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[1].stack).toBe('total')
      },
    )
  },
)
