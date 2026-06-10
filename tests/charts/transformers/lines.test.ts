import { describe, it, expect } from 'bun:test'
import { createLinesChartOption } from '../../../src/charts/transformers/lines'
import type { LinesSeriesOption } from 'echarts'

describe(
  'createLinesChartOption',
  () => {
    const data = [
      { startX: 10,
        startY: 10,
        endX: 20,
        endY: 20,
        group: 'A' },
      { startX: 30,
        startY: 30,
        endX: 40,
        endY: 40,
        group: 'A' },
      { startX: 100,
        startY: 100,
        endX: 110,
        endY: 110,
        group: 'B' },
    ]

    it(
      'should create lines chart options',
      () => {
        const option = createLinesChartOption(
          data,
          'startX',
          'startY',
          {
            x2Prop: 'endX',
            y2Prop: 'endY',
            seriesProp: 'group',
          },
        )

        const series = option.series as readonly LinesSeriesOption[]
        expect(series).toHaveLength(2) // A, B
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].type).toBe('lines')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].coordinateSystem).toBe('cartesian2d')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].data).toHaveLength(2)

        // Check coords
        // @ts-expect-error - suppress strictNullChecks in tests
        const data0 = series[0].data as readonly { readonly coords: readonly (readonly number[])[] }[]
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(data0[0].coords).toEqual([[10,
          10],
        [20,
          20]])
      },
    )

    it(
      'should handle missing options gracefully',
      () => {
        // Missing End X/Y should return empty object or minimal config
        const option = createLinesChartOption(
          data,
          'startX',
          'startY',
        )
        expect(option).toEqual({})
      },
    )
  },
)
