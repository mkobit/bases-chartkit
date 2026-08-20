import { describe, it, expect } from 'bun:test'
import { createCartesianChartOption } from '../../src/charts/transformers/cartesian'
import type { BarSeriesOption, DatasetComponentOption, EChartsOption, LineSeriesOption } from 'echarts'

// DatasetComponentOption is a single interface (not a discriminated union), so
// EChartsOption['dataset'] just needs the array/object split -- no cast.
function datasetArray(option: EChartsOption): readonly DatasetComponentOption[] {
  return Array.isArray(option.dataset) ? option.dataset : option.dataset === undefined ? [] : [option.dataset]
}

// The cartesian dataset source rows are { x, y, s }; DatasetOption['source'] is
// a broad library union with no discriminant, so a runtime guard + flatMap
// recovers the shape without a cast.
interface CartesianRow {
  readonly x: string
  readonly y: number | null
  readonly s: string
}
function isCartesianRow(value: unknown): value is CartesianRow {
  return typeof value === 'object' && value !== null && 'x' in value && typeof value.x === 'string' && 'y' in value && (typeof value.y === 'number' || value.y === null) && 's' in value && typeof value.s === 'string'
}
function cartesianSource(option: EChartsOption): readonly CartesianRow[] {
  const dataset = Array.isArray(option.dataset) ? option.dataset[0] : option.dataset
  const source = dataset?.source
  return Array.isArray(source) ? source.flatMap(row => isCartesianRow(row) ? [row] : []) : []
}

// EChartsOption['series'] is a `type`-discriminated union; checking the literal
// `type` narrows to the cartesian members with no cast.
function firstCartesianSeries(option: EChartsOption): BarSeriesOption | LineSeriesOption {
  const series = Array.isArray(option.series) ? option.series[0] : option.series
  if (series?.type !== 'bar' && series?.type !== 'line') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a bar/line series, got ${String(series?.type)}`)
  }
  return series
}
function cartesianLineSeries(option: EChartsOption): readonly LineSeriesOption[] {
  const series = Array.isArray(option.series) ? option.series : option.series === undefined ? [] : [option.series]
  return series.flatMap(s => s.type === 'line' ? [s] : [])
}

describe(
  'Cartesian Chart Transformer (Dataset Architecture)',
  () => {
    const data = [
      { date: '2023-01-01',
        value: 10,
        category: 'A' },
      { date: '2023-01-02',
        value: 20,
        category: 'A' },
      { date: '2023-01-01',
        value: 15,
        category: 'B' },
      { date: '2023-01-03',
        value: 25,
        category: 'B' },
    ]

    it(
      'should reject rows with invalid x or y fields',
      () => {
        expect(isCartesianRow({ x: 1, y: 2, s: 'value' })).toBe(false)
      },
    )

    it(
      'should create a simple bar chart using dataset',
      () => {
        const option = createCartesianChartOption(
          data,
          'date',
          'value',
          'bar',
        )

        expect(option.dataset).toBeDefined()
        // Check source dataset
        const datasets = datasetArray(option)
        expect(datasets[0]).toHaveProperty('source')

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(datasets[0].source).toHaveLength(4)

        // Check series
        const series = firstCartesianSeries(option)
        expect(series).toBeDefined()
        expect(series.type).toBe('bar')
        expect(series.datasetIndex).toBeDefined()
        expect(series.encode).toEqual({ x: 'x',
          y: 'y',
          tooltip: ['x',
            'y',
            's'] })
      },
    )

    it(
      'should use the y-field label as the legend/series name when no seriesProp is configured',
      () => {
        // Reproduces the Sales-Dashboard.base bug: a single-series bar chart's
        // legend showed the generic 'Series 1' instead of the Revenue field name.
        const option = createCartesianChartOption(
          data,
          'date',
          'value',
          'bar',
        )

        const source = cartesianSource(option)
        expect(source.every(row => row.s === 'value')).toBe(true)

        const series = firstCartesianSeries(option)
        expect(series.name).toBe('value')
      },
    )

    it(
      'should handle series grouping using filter transforms',
      () => {
        const option = createCartesianChartOption(
          data,
          'date',
          'value',
          'line',
          { seriesProp: 'category' },
        )

        expect(option.dataset).toBeDefined()
        const datasets = datasetArray(option)

        // Should have 1 source + 2 filtered datasets (A and B)
        expect(datasets.length).toBeGreaterThanOrEqual(3)

        // Verify transforms exist
        const transformDatasets = datasets.filter(d => d.transform)
        expect(transformDatasets.length).toBe(2)

        // Explicit check for transform type

        // @ts-expect-error - suppress strictNullChecks in tests
        const t = transformDatasets[0].transform
        expect(t !== undefined && !Array.isArray(t) && 'type' in t ? t.type : undefined).toBe('filter')

        // Verify series reference these datasets
        const series = cartesianLineSeries(option)
        expect(series).toHaveLength(2)

        expect(series[0]?.datasetIndex).toBeGreaterThan(0)

        expect(series[1]?.datasetIndex).toBeGreaterThan(0)
      },
    )

    it(
      'should stack line series when stack is enabled (stacked-area path)',
      () => {
        const option = createCartesianChartOption(
          data,
          'date',
          'value',
          'line',
          { seriesProp: 'category',
            areaStyle: true,
            stack: true },
        )

        const series = cartesianLineSeries(option)
        expect(series).toHaveLength(2)
        expect(series.every(s => s.stack === 'total')).toBe(true)
        expect(series.every(s => s.areaStyle !== undefined)).toBe(true)
      },
    )

    it(
      'should not set stack on series when stack is omitted',
      () => {
        const option = createCartesianChartOption(
          data,
          'date',
          'value',
          'line',
          { seriesProp: 'category' },
        )

        const series = cartesianLineSeries(option)
        expect(series.every(s => s.stack === undefined)).toBe(true)
      },
    )

    it(
      'should handle flipAxis correctly',
      () => {
        const option = createCartesianChartOption(
          data,
          'date',
          'value',
          'bar',
          { flipAxis: true },
        )

        const series = Array.isArray(option.series) ? option.series[0] : option.series
        expect(series).toBeDefined()

        const yAxis = Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis
        expect(yAxis?.type).toBe('category')
        const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
        expect(xAxis?.type).toBe('value')
      },
    )
  },
)
