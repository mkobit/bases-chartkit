import { describe, it, expect } from 'bun:test'
import { createPieChartOption } from '../../src/charts/transformers/pie'
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

describe(
  'Pie Chart Transformer (Dataset Architecture)',
  () => {
    const data = [
      { name: 'Item A',
        value: 10 },
      { name: 'Item B',
        value: 20 },
    ]

    it(
      'should create a pie chart using dataset',
      () => {
        const option = createPieChartOption(
          data,
          'name',
          'value',
        )

        expect(option.dataset).toBeDefined()
        // Check source dataset
        const dataset = Array.isArray(option.dataset) ? option.dataset[0] : option.dataset
        expect(dataset).toHaveProperty('source')

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(dataset.source).toHaveLength(2)

        // Check series
        const series = firstPieSeries(option)
        expect(series).toBeDefined()
        expect(series.type).toBe('pie')
        expect(series.datasetIndex).toBe(0)
        expect(series.encode).toEqual({ itemName: 'name',
          value: 'value' })
      },
    )
  },
)
