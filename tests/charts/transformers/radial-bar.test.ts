import { describe, it, expect } from 'bun:test'
import { createRadialBarChartOption } from '../../../src/charts/transformers/radial-bar'
import type { BarSeriesOption } from 'echarts'

describe(
  'createRadialBarChartOption',
  () => {
    const data = [
      { category: 'A',
        value: 10,
        group: 'G1' },
      { category: 'B',
        value: 20,
        group: 'G1' },
      { category: 'A',
        value: 15,
        group: 'G2' },
      { category: 'B',
        value: 25,
        group: 'G2' },
      { category: 'C',
        value: 30,
        group: 'G1' },
    ]

    it(
      'should create a basic radial bar chart option',
      () => {
        const option = createRadialBarChartOption(
          data,
          'category',
          'value',
        )

        expect(option.polar).toBeDefined()
        expect(option.angleAxis).toEqual(expect.objectContaining({
          type: 'category',

          data: expect.arrayContaining(['A',
            'B',
            'C']),
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
      'should handle grouped data',
      () => {
        const option = createRadialBarChartOption(
          data,
          'category',
          'value',
          { seriesProp: 'group' },
        )

        const series = option.series as BarSeriesOption[]
        expect(series).toHaveLength(2) // G1, G2
        expect(series.map(s => s.name)).toEqual(expect.arrayContaining(['G1',
          'G2']))
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].coordinateSystem).toBe('polar')
      },
    )

    it(
      'should handle stacked data',
      () => {
        const option = createRadialBarChartOption(
          data,
          'category',
          'value',
          {
            seriesProp: 'group',
            stack: true,
          },
        )

        const series = option.series as BarSeriesOption[]
        expect(series).toHaveLength(2)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].stack).toBe('total')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[1].stack).toBe('total')
      },
    )

    it(
      'should handle empty data',
      () => {
        const option = createRadialBarChartOption(
          [],
          'category',
          'value',
        )

        const series = option.series as BarSeriesOption[]
        expect(series).toHaveLength(0)
      },
    )

    it(
      'should handle legend options',
      () => {
        const option = createRadialBarChartOption(
          data,
          'category',
          'value',
          { legend: true },
        )
        expect(option.legend).toBeDefined()
      },
    )
  },
)
