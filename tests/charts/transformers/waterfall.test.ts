import { describe, it, expect } from 'bun:test'
import * as echarts from 'echarts'
import type { BarSeriesOption, EChartsOption } from 'echarts'
import { createWaterfallChartOption } from '../../../src/charts/transformers/waterfall'

// Waterfall builds only bar series; checking the literal `type` discriminant
// narrows the series union with no cast.
function waterfallSeries(option: EChartsOption): readonly BarSeriesOption[] {
  const series = Array.isArray(option.series)
    ? option.series
    : option.series === undefined
      ? []
      : [option.series]
  return series.flatMap(s => (s.type === 'bar' ? [s] : []))
}
function seriesNamed(series: readonly BarSeriesOption[], name: string): BarSeriesOption {
  const found = series.find(s => s.name === name)
  if (found === undefined) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a "${name}" series`)
  }
  return found
}

describe('createWaterfallChartOption', () => {
  const data = [
    { category: 'A', value: 100 },
    { category: 'B', value: -20 },
    { category: 'C', value: 30 },
    { category: 'D', value: -10 },
  ]

  it('should create a valid waterfall chart option with base, increase, and decrease series', () => {
    const option = createWaterfallChartOption(data, 'category', 'value')

    expect(option).toBeDefined()

    // Check X Axis
    expect(option.xAxis).toBeDefined()
    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
    if (xAxis?.type !== 'category') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected a category xAxis, got ${String(xAxis?.type)}`)
    }
    expect(xAxis).toBeDefined()

    expect(xAxis.data).toEqual(['A', 'B', 'C', 'D'])

    // Check Series
    expect(option.series).toBeDefined()
    const series = waterfallSeries(option)
    expect(series).toHaveLength(3)

    const baseSeries = seriesNamed(series, '_base')
    const increaseSeries = seriesNamed(series, 'Increase')
    const decreaseSeries = seriesNamed(series, 'Decrease')

    expect(baseSeries).toBeDefined()
    expect(increaseSeries).toBeDefined()
    expect(decreaseSeries).toBeDefined()

    // Check Base Data (Accumulated)
    expect(baseSeries.data).toEqual([0, 80, 80, 100])

    // Check Increase Data
    expect(increaseSeries.data).toEqual([100, '-', 30, '-'])

    // Check Decrease Data
    expect(decreaseSeries.data).toEqual(['-', 20, '-', 10])

    // Check Styling
    expect(baseSeries.itemStyle?.color).toBe('transparent')
    expect(increaseSeries.itemStyle?.color).toBe('#14b143')
    expect(decreaseSeries.itemStyle?.color).toBe('#ef232a')
  })

  it('should handle string values and filter invalid data', () => {
    const dirtyData = [
      { category: 'A', value: '100' },
      { category: 'B', value: null }, // Invalid
      { category: 'C', value: '-50' },
    ]

    const option = createWaterfallChartOption(dirtyData, 'category', 'value')

    expect(option.xAxis).toBeDefined()
    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
    if (xAxis?.type !== 'category') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected a category xAxis, got ${String(xAxis?.type)}`)
    }
    expect(xAxis).toBeDefined()

    expect(xAxis.data).toEqual(['A', 'C'])

    const series = waterfallSeries(option)
    const baseSeries = seriesNamed(series, '_base')

    expect(baseSeries.data).toEqual([0, 50])
  })

  it('should return empty option if data is empty', () => {
    const option = createWaterfallChartOption([], 'category', 'value')
    expect(option.series).toBeDefined()
    expect(waterfallSeries(option)[0]?.data).toHaveLength(0)
  })

  it('draws a connector markLine at each running-sum boundary between adjacent bars', () => {
    // Running sums after A/B/C/D = 100 / 80 / 110 / 100.
    const option = createWaterfallChartOption(data, 'category', 'value')
    const series = waterfallSeries(option)
    const baseSeries = seriesNamed(series, '_base')

    // One connector per adjacent pair (n-1), each a flat segment at the
    // shared boundary height, spanning the two category indices.
    expect(baseSeries.markLine?.data).toEqual([
      [{ coord: [0, 100] }, { coord: [1, 100] }],
      [{ coord: [1, 80] }, { coord: [2, 80] }],
      [{ coord: [2, 110] }, { coord: [3, 110] }],
    ])
    expect(baseSeries.markLine?.silent).toBe(true)
  })

  it('does not add a Total series when no totalProp is configured', () => {
    const option = createWaterfallChartOption(data, 'category', 'value')
    const series = waterfallSeries(option)
    expect(series.find(s => s.name === 'Total')).toBeUndefined()
    expect(series).toHaveLength(3)
  })

  it('renders totalProp-flagged rows as absolute bars from zero and resets the running sum', () => {
    const totalData = [
      { category: 'Start', value: 1000, total: true },
      { category: 'Up', value: 200, total: false },
      { category: 'Down', value: -50, total: false },
      { category: 'End', value: 1150, total: true },
    ]

    const option = createWaterfallChartOption(totalData, 'category', 'value', {
      totalProp: 'total',
    })
    const series = waterfallSeries(option)
    const baseSeries = seriesNamed(series, '_base')
    const increaseSeries = seriesNamed(series, 'Increase')
    const decreaseSeries = seriesNamed(series, 'Decrease')
    const totalSeries = seriesNamed(series, 'Total')

    expect(totalSeries).toBeDefined()
    // Total bars sit at index 0 and 3, drawn from a zero base.
    expect(totalSeries.data).toEqual([1000, '-', '-', 1150])
    expect(baseSeries.data).toEqual([0, 1000, 1150, 0])
    // Deltas stack on the reset baseline: Up rises from 1000, Down falls to 1150.
    expect(increaseSeries.data).toEqual(['-', 200, '-', '-'])
    expect(decreaseSeries.data).toEqual(['-', '-', 50, '-'])
    // Connectors follow the reset sums: 1000 -> 1200 -> 1150 -> 1150.
    expect(baseSeries.markLine?.data).toEqual([
      [{ coord: [0, 1000] }, { coord: [1, 1000] }],
      [{ coord: [1, 1200] }, { coord: [2, 1200] }],
      [{ coord: [2, 1150] }, { coord: [3, 1150] }],
    ])
  })

  it('treats the string "true" as a total flag', () => {
    const option = createWaterfallChartOption(
      [{ category: 'A', value: 42, total: 'true' }],
      'category',
      'value',
      { totalProp: 'total' },
    )
    const series = waterfallSeries(option)
    const totalSeries = seriesNamed(series, 'Total')
    expect(totalSeries.data).toEqual([42])
  })

  it('renders all 8 step labels, keeps Step unclipped, and suppresses overlapping labels on thin bars in SVG', () => {
    const budgetData = [
      { Step: 'Starting Balance', Change: 500, IsTotal: true },
      { Step: 'Q1 Gross Revenue', Change: 33, IsTotal: false },
      { Step: 'R&D Operations', Change: -228, IsTotal: false },
      { Step: 'Marketing Campaign', Change: 312, IsTotal: false },
      { Step: 'Q2 Gross Revenue', Change: -8, IsTotal: false },
      { Step: 'Infrastructure Cost', Change: 354, IsTotal: false },
      { Step: 'Tax & Interest', Change: -2, IsTotal: false },
      { Step: 'Net Balance', Change: 961, IsTotal: true },
    ]
    const option = createWaterfallChartOption(budgetData, 'Step', 'Change', {
      totalProp: 'IsTotal',
      containerWidth: 668,
    })

    const chart = echarts.init(null, undefined, {
      renderer: 'svg',
      ssr: true,
      width: 668,
      height: 501,
    })
    try {
      chart.setOption(option)
      const svg = chart.renderToSVGString()
      expect(svg).toContain('>Step<')
      for (const row of budgetData) {
        expect(svg).toContain(row.Step.replace('&', '&amp;'))
      }
      expect(svg).toContain('>500<')
      expect(svg).toContain('>228<')
      expect(svg).toContain('>961<')
      expect(svg).not.toContain('>8<')
      expect(svg).not.toContain('>2<')

      const stepMatch = svg.match(/<text[^>]*transform="translate\(([^)]+)\)"[^>]*>Step<\/text>/)
      expect(stepMatch).not.toBeNull()
      const [stepX] = (stepMatch?.[1] ?? '0 0').split(/\s+/).map(Number)
      expect(stepX).toBeLessThanOrEqual(668 - 30)
    } finally {
      chart.dispose()
    }
  })

  it('omits hardcoded bar colors when a custom theme is active so the theme palette applies', () => {
    const option = createWaterfallChartOption(
      [
        { category: 'Start', value: 100, total: true },
        { category: 'Up', value: 50, total: false },
        { category: 'Down', value: -20, total: false },
      ],
      'category',
      'value',
      {
        totalProp: 'total',
        theme: 'Vintage',
        upColor: '#14b143',
        downColor: '#ef232a',
      },
    )

    const series = waterfallSeries(option)
    const baseSeries = seriesNamed(series, '_base')
    const increaseSeries = seriesNamed(series, 'Increase')
    const decreaseSeries = seriesNamed(series, 'Decrease')
    const totalSeries = seriesNamed(series, 'Total')

    expect(baseSeries.itemStyle?.color).toBe('transparent')
    expect(increaseSeries.itemStyle?.color).toBeUndefined()
    expect(decreaseSeries.itemStyle?.color).toBeUndefined()
    expect(totalSeries.itemStyle?.color).toBeUndefined()
  })

  it('keeps semantic up/down/total colors for default, dark, and obsidian-auto themes', () => {
    ;([undefined, 'default', 'dark', 'obsidian-auto'] as const).forEach(theme => {
      const option = createWaterfallChartOption(
        [
          { category: 'Start', value: 100, total: true },
          { category: 'Up', value: 50, total: false },
          { category: 'Down', value: -20, total: false },
        ],
        'category',
        'value',
        {
          totalProp: 'total',
          ...(theme !== undefined ? { theme } : {}),
        },
      )

      const series = waterfallSeries(option)
      expect(seriesNamed(series, 'Increase').itemStyle?.color).toBe('#14b143')
      expect(seriesNamed(series, 'Decrease').itemStyle?.color).toBe('#ef232a')
      expect(seriesNamed(series, 'Total').itemStyle?.color).toBe('#5470c6')
    })
  })
})
