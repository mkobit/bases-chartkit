import { describe, it, expect } from 'bun:test'
import * as echarts from 'echarts'
import { createParetoChartOption } from '../../../src/charts/transformers/pareto'
import type {
  BarSeriesOption,
  EChartsOption,
  LineSeriesOption,
  YAXisComponentOption,
  XAXisComponentOption,
} from 'echarts'

// Pareto's dataset source rows are { name, value, cumulative }; DatasetOption's
// source is a broad library union with no discriminant, so a runtime guard +
// flatMap recovers the shape without a cast.
interface ParetoRow {
  readonly name: string
  readonly value: number
  readonly cumulative: number
}
function isParetoRow(value: unknown): value is ParetoRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'value' in value &&
    typeof value.value === 'number' &&
    'cumulative' in value &&
    typeof value.cumulative === 'number'
  )
}
function paretoSource(option: EChartsOption): readonly ParetoRow[] {
  const dataset = Array.isArray(option.dataset) ? option.dataset[0] : option.dataset
  const source = dataset?.source
  return Array.isArray(source) ? source.flatMap(row => (isParetoRow(row) ? [row] : [])) : []
}

// EChartsOption's axis/series fields can each be a single option or an array;
// splitting that (and, for series, checking the literal `type` discriminant)
// narrows without any cast.
function paretoYAxes(option: EChartsOption): readonly YAXisComponentOption[] {
  return Array.isArray(option.yAxis)
    ? option.yAxis
    : option.yAxis === undefined
      ? []
      : [option.yAxis]
}
function paretoXAxis(option: EChartsOption): XAXisComponentOption {
  const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
  if (xAxis === undefined) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error('expected an xAxis')
  }
  return xAxis
}
function paretoSeries(option: EChartsOption): readonly (BarSeriesOption | LineSeriesOption)[] {
  const series = Array.isArray(option.series)
    ? option.series
    : option.series === undefined
      ? []
      : [option.series]
  return series.flatMap(s => (s.type === 'bar' || s.type === 'line' ? [s] : []))
}

describe('createParetoChartOption', () => {
  const data = [
    { category: 'A', value: 10 },
    { category: 'B', value: 40 },
    { category: 'C', value: 30 },
    { category: 'D', value: 20 },
  ]

  it('should sort data by value descending', () => {
    const option = createParetoChartOption(data, 'category', 'value')
    const source = paretoSource(option)

    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[0].name).toBe('B')
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[0].value).toBe(40)
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[1].name).toBe('C')
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[1].value).toBe(30)
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[2].name).toBe('D')
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[2].value).toBe(20)
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[3].name).toBe('A')
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[3].value).toBe(10)
  })

  it('should calculate cumulative percentage correctly', () => {
    const option = createParetoChartOption(data, 'category', 'value')
    const source = paretoSource(option)

    // Total = 100
    // B: 40 -> 40%
    // C: 30 -> 70%
    // D: 20 -> 90%
    // A: 10 -> 100%

    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[0].cumulative).toBe(40)
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[1].cumulative).toBe(70)
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[2].cumulative).toBe(90)
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[3].cumulative).toBe(100)
  })

  it('should configure dual y-axes', () => {
    const option = createParetoChartOption(data, 'category', 'value')
    const yAxis = paretoYAxes(option)

    expect(yAxis).toHaveLength(2)
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(yAxis[0].name).toBe('value')
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(yAxis[1].name).toBe('Cumulative %')
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(yAxis[1].min).toBe(0)
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(yAxis[1].max).toBe(100)
  })

  it('should configure bar and line series on correct axes', () => {
    const option = createParetoChartOption(data, 'category', 'value')
    const series = paretoSeries(option)

    expect(series).toHaveLength(2)

    const barSeries = series[0]
    if (barSeries?.type !== 'bar') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected a bar series, got ${String(barSeries?.type)}`)
    }
    expect(barSeries.type).toBe('bar')
    expect(barSeries.yAxisIndex).toBe(0)
    expect(barSeries.encode).toEqual({ x: 'name', y: 'value' })

    const lineSeries = series[1]
    if (lineSeries?.type !== 'line') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected a line series, got ${String(lineSeries?.type)}`)
    }
    expect(lineSeries.type).toBe('line')
    expect(lineSeries.yAxisIndex).toBe(1)
    expect(lineSeries.encode).toEqual({ x: 'name', y: 'cumulative' })
  })

  it('should handle custom axis labels', () => {
    const option = createParetoChartOption(data, 'category', 'value', {
      xAxisLabel: 'Cat',
      yAxisLabel: 'Val',
    })

    const xAxis = paretoXAxis(option)
    const yAxis = paretoYAxes(option)

    expect(xAxis.name).toBe('Cat')
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(yAxis[0].name).toBe('Val')
  })

  it('should center the x-axis title so it does not collide with the right y-axis label', () => {
    const option = createParetoChartOption(data, 'category', 'value')
    const xAxis = paretoXAxis(option)

    expect(xAxis.nameLocation).toBe('middle')
  })

  it('should filter out invalid values', () => {
    const dirtyData = [
      { category: 'A', value: 10 },
      { category: 'B', value: 'invalid' },
      { category: 'C', value: 20 },
    ]

    const option = createParetoChartOption(dirtyData, 'category', 'value')
    const source = paretoSource(option)

    expect(source).toHaveLength(2)
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[0].name).toBe('C')
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[1].name).toBe('A')

    // C: 20 (66.6%), A: 10 (100%) - Total 30
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[0].cumulative).toBeCloseTo(66.666, 2)
    // @ts-expect-error - suppress strictNullChecks in tests
    expect(source[1].cumulative).toBeCloseTo(100, 2)
  })

  it('renders clean round Cumulative % ticks (0..100 step 20) and fits all category labels and axis names in SVG', () => {
    const productData = [
      { Product: 'Matcha Latte', Sales: 5320 },
      { Product: 'Cheese Cocoa', Sales: 2600 },
      { Product: 'Walnut Brownie', Sales: 2047 },
      { Product: 'Espresso', Sales: 1370 },
      { Product: 'Fruit Tea', Sales: 1100 },
      { Product: 'Cold Brew', Sales: 1054 },
      { Product: 'Taro Smoothie', Sales: 953 },
      { Product: 'Oolong Tea', Sales: 916 },
      { Product: 'Americano', Sales: 725 },
    ]
    const option = createParetoChartOption(productData, 'Product', 'Sales', { containerWidth: 668 })
    const yAxes = paretoYAxes(option)
    const rightAxis = yAxes[1]
    if (rightAxis && 'interval' in rightAxis) {
      expect(rightAxis.interval).toBe(20)
    }

    const chart = echarts.init(null, undefined, {
      renderer: 'svg',
      ssr: true,
      width: 668,
      height: 501,
    })
    try {
      chart.setOption(option)
      const svg = chart.renderToSVGString()
      expect(svg).toContain('20 %')
      expect(svg).toContain('40 %')
      expect(svg).toContain('60 %')
      expect(svg).toContain('80 %')
      expect(svg).not.toContain('16.67 %')
      expect(svg).not.toContain('33.34 %')
      for (const row of productData) {
        expect(svg).toContain(row.Product)
      }
      expect(svg).toContain('>Product<')
      const prodMatch = svg.match(/<text[^>]*transform="translate\(([^)]+)\)"[^>]*>Product<\/text>/)
      expect(prodMatch).not.toBeNull()
      const [px, py] = (prodMatch?.[1] ?? '0 0').split(/\s+/).map(Number)
      expect(px).toBeGreaterThan(0)
      expect(px).toBeLessThan(668)
      expect(py).toBeLessThan(495)
    } finally {
      chart.dispose()
    }
  })
})
