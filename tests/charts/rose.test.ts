import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../../src/charts/transformer'
import type { EChartsOption, PieSeriesOption } from 'echarts'

// EChartsOption['series'] is a `type`-discriminated union, so checking the
// literal `type` narrows `series` to PieSeriesOption -- no cast needed.
function firstPieSeries(option: EChartsOption): PieSeriesOption {
  const series = Array.isArray(option.series) ? option.series[0] : option.series
  if (series?.type !== 'pie') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a pie series, got ${String(series?.type)}`)
  }
  return series
}

// DatasetOption['source'] is a generic library union with no discriminant TS
// can check -- return the raw array for structural (toEqual) assertions.
function firstDatasetSource(option: EChartsOption): readonly unknown[] {
  const dataset = Array.isArray(option.dataset) ? option.dataset[0] : option.dataset
  const source = dataset?.source
  return Array.isArray(source) ? source : []
}

describe(
  'Rose Chart Transformer',
  () => {
    it(
      'should create a rose chart with roseType: area',
      () => {
        const data = [
          { category: 'A',
            value: 10 },
          { category: 'B',
            value: 20 },
        ]

        const option = transformDataToChartOption(
          data,
          'category',
          'value',
          'rose',
        )

        expect(option.series).toBeDefined()
        expect(option.series).toHaveLength(1)

        const series = firstPieSeries(option)
        expect(series.type).toBe('pie')
        expect(series.roseType).toBe('area')
        expect(series.radius).toEqual([20,
          '75%'])
      },
    )

    it(
      'should map data correctly via dataset',
      () => {
        const data = [
          { category: 'A',
            value: 10 },
          { category: 'B',
            value: 20 },
        ]

        const option = transformDataToChartOption(
          data,
          'category',
          'value',
          'rose',
        )
        const series = firstPieSeries(option)

        expect(series.datasetIndex).toBe(0)
        expect(option.dataset).toBeDefined()

        const source = firstDatasetSource(option)
        expect(source).toHaveLength(2)
        expect(source).toEqual([
          { name: 'A',
            value: 10 },
          { name: 'B',
            value: 20 },
        ])
      },
    )
  },
)
