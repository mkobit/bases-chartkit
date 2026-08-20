import { describe, it, expect } from 'bun:test'
import { createLinesChartOption } from '../../../src/charts/transformers/lines'
import type { EChartsOption, LinesSeriesOption } from 'echarts'

// EChartsOption['series'] is a `type`-discriminated union; keeping only the
// members whose literal `type` is 'lines' narrows to LinesSeriesOption[] with
// no cast.
function linesSeriesArray(option: EChartsOption): readonly LinesSeriesOption[] {
  const series = Array.isArray(option.series) ? option.series : option.series === undefined ? [] : [option.series]
  return series.flatMap(s => s.type === 'lines' ? [s] : [])
}

// A single 'lines' datum carries its segment endpoints as a coords tuple list;
// DataItemOption['data'] is a broad library union, so a runtime guard + flatMap
// recovers the shape without casting.
interface LinesDatum {
  readonly coords: readonly (readonly number[])[]
}
function isLinesDatum(value: unknown): value is LinesDatum {
  return typeof value === 'object' && value !== null && 'coords' in value && Array.isArray(value.coords) && value.coords.every(coords => Array.isArray(coords) && coords.every(coordinate => typeof coordinate === 'number'))
}

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
      'should reject data with non-numeric coordinates',
      () => {
        expect(isLinesDatum({ coords: [[1, 'invalid']] })).toBe(false)
      },
    )

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

        const series = linesSeriesArray(option)
        expect(series).toHaveLength(2) // A, B
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].type).toBe('lines')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].coordinateSystem).toBe('cartesian2d')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].data).toHaveLength(2)

        // Check coords
        // @ts-expect-error - suppress strictNullChecks in tests
        const rawLinesData = series[0].data
        const data0 = Array.isArray(rawLinesData) ? rawLinesData.flatMap(d => isLinesDatum(d) ? [d] : []) : []
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(data0[0].coords).toEqual([[10,
          10],
        [20,
          20]])

        // 'lines' series never contributes its coords to ECharts' axis
        // auto-scaling, so min/max must be pinned explicitly to the real
        // data range or most segments render off-canvas.
        expect(option.xAxis).toMatchObject({ min: 10,
          max: 110 })
        expect(option.yAxis).toMatchObject({ min: 10,
          max: 110 })
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
