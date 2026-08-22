import { describe, it, expect } from 'bun:test'
import type { CandlestickSeriesOption, EChartsOption } from 'echarts'
import { transformDataToChartOption } from '../src/charts/transformer'

interface CandlestickSourceRow {
  readonly x: string
  readonly open: number
  readonly close: number
  readonly low: number
  readonly high: number
}

function isCandlestickSourceRow(value: unknown): value is CandlestickSourceRow {
  return typeof value === 'object' && value !== null
    && 'x' in value && typeof value.x === 'string'
    && 'open' in value && typeof value.open === 'number'
    && 'close' in value && typeof value.close === 'number'
    && 'low' in value && typeof value.low === 'number'
    && 'high' in value && typeof value.high === 'number'
}

// EChartsOption['series'] is a `type`-discriminated union, so this needs no
// cast -- checking the literal `type` narrows `series` to CandlestickSeriesOption.
function firstCandlestickSeries(option: EChartsOption): CandlestickSeriesOption {
  const series = Array.isArray(option.series) ? option.series[0] : option.series
  if (series?.type !== 'candlestick') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a candlestick series, got ${String(series?.type)}`)
  }
  return series
}

// candlestick.ts always sets xAxis.type to 'category' (only that member has
// `.data`/`.axisLabel`), so this checks the real discriminant.
function firstCategoryXAxis(option: EChartsOption) {
  const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
  if (xAxis?.type !== 'category') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a category xAxis, got ${String(xAxis?.type)}`)
  }
  return xAxis
}

// DatasetOption['source'] is a generic library union with no discriminant TS
// can check -- this is a genuine runtime shape check, not an unverified cast.
function firstDatasetSource(option: EChartsOption): readonly CandlestickSourceRow[] {
  const dataset = Array.isArray(option.dataset) ? option.dataset[0] : option.dataset
  const source = dataset?.source
  return Array.isArray(source) ? source.flatMap(row => isCandlestickSourceRow(row) ? [row] : []) : []
}

describe(
  'Transformer - Candlestick Chart',
  () => {
    const data = [
      { date: '2023-10-01',
        open: 100,
        close: 110,
        low: 95,
        high: 115 },
      { date: '2023-10-02',
        open: 110,
        close: 105,
        low: 100,
        high: 112 },
      { date: '2023-10-03',
        open: 105,
        close: 120,
        low: 105,
        high: 125 },
    ]

    it(
      'should create candlestick chart options correctly',
      () => {
        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'candlestick',
          {
            openProp: 'open',
            closeProp: 'close',
            lowProp: 'low',
            highProp: 'high',
          },
        )

        // Basic Structure
        expect(option).toHaveProperty('series')

        expect(Array.isArray(option.series)).toBe(true)
        expect(option.series).toHaveLength(1)
        const series = firstCandlestickSeries(option)
        expect(series.type).toBe('candlestick')

        // Data Verification (using Dataset)
        // Check dataset presence
        expect(option.dataset).toBeDefined()
        expect(Array.isArray(option.dataset)).toBe(true)
        expect(option.dataset).not.toHaveLength(0)

        const source = firstDatasetSource(option)

        expect(source).toHaveLength(3)
        // Normalized data structure
        expect(source[0]).toEqual({ x: '2023-10-01',
          open: 100,
          close: 110,
          low: 95,
          high: 115 })

        // Encode Verification
        expect(series.encode).toEqual({
          x: 'x',
          y: ['open',
            'close',
            'low',
            'high'],
          tooltip: ['open',
            'close',
            'low',
            'high'],
        })

        // Axis Verification
        expect(option.xAxis).toBeDefined()
        expect(firstCategoryXAxis(option).data).toEqual(['2023-10-01',
          '2023-10-02',
          '2023-10-03'])
      },
    )

    it(
      'should handle missing values gracefully',
      () => {
        const messyData = [
          { date: '2023-10-01',
            open: 100,
            close: 110,
            low: 95,
            high: 115 },
          { date: '2023-10-02',
            open: null,
            close: 105,
            low: 100,
            high: 112 }, // Missing Open
          { date: '2023-10-03',
            open: 105,
            close: 120,
            low: undefined,
            high: 125 }, // Missing Low
        ]

        const option = transformDataToChartOption(
          messyData,
          'date',
          '',
          'candlestick',
          {
            openProp: 'open',
            closeProp: 'close',
            lowProp: 'low',
            highProp: 'high',
          },
        )

        expect(option.dataset).toBeDefined()
        expect(Array.isArray(option.dataset)).toBe(true)
        expect(option.dataset).not.toHaveLength(0)
        expect(option.dataset).not.toHaveLength(0)

        const source = firstDatasetSource(option)

        // Should ignore invalid rows (open: null and low: undefined should cause rows to be skipped)
        expect(source).toHaveLength(1)
        expect(source[0]).toEqual({ x: '2023-10-01',
          open: 100,
          close: 110,
          low: 95,
          high: 115 })

        // Check xAxis data sync
        expect(firstCategoryXAxis(option).data).toEqual(['2023-10-01'])
      },
    )

    const invokeTooltip = (option: ReturnType<typeof transformDataToChartOption>, row: Record<string, unknown>): string => {
      const tooltip = Array.isArray(option.tooltip) ? option.tooltip[0] : option.tooltip
      const formatter = tooltip?.formatter
      if (typeof formatter !== 'function') {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
        throw new Error(`expected tooltip.formatter to be a function, got ${typeof formatter}`)
      }
      // eslint-disable-next-line no-restricted-syntax -- library callback type bridge: ECharts' TooltipFormatterCallback params are a huge CallbackDataParams union (and its return is string|HTMLElement) this test's minimal { value, marker } array can't model; see heatmap_chart.test.ts's label-formatter test for the same pattern.
      return (formatter as unknown as (params: readonly { readonly value: unknown, readonly marker: string }[]) => string)([{ value: row, marker: '' }])
    }

    it(
      'labels the tooltip in Open/High/Low/Close order with a signed, colored change line',
      () => {
        // bck-aie.29 feedback ("i dont know what the hover values mean"): the
        // raw OHLC labels alone don't say up-or-down. A Change line interprets
        // them; reading order follows the OHLC acronym, not the dataset keys.
        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'candlestick',
          { openProp: 'open', closeProp: 'close', lowProp: 'low', highProp: 'high' },
        )
        // Up day: open 100 -> close 110 = +10 (+10.00%), bull green.
        const upText = invokeTooltip(option, { x: '2023-10-01', open: 100, close: 110, low: 95, high: 115 })

        expect(upText.indexOf('Open:')).toBeLessThan(upText.indexOf('High:'))
        expect(upText.indexOf('High:')).toBeLessThan(upText.indexOf('Low:'))
        expect(upText.indexOf('Low:')).toBeLessThan(upText.indexOf('Close:'))
        expect(upText).toContain('Change:')
        expect(upText).toContain('▲ +10 (+10.00%)')
        expect(upText).toContain('#14b143')
      },
    )

    it(
      'shows a bear-red down arrow and negative change when close is below open',
      () => {
        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'candlestick',
          { openProp: 'open', closeProp: 'close', lowProp: 'low', highProp: 'high' },
        )
        // Down day: open 110 -> close 105 = -5 (-4.55%), bear red.
        const downText = invokeTooltip(option, { x: '2023-10-02', open: 110, close: 105, low: 100, high: 112 })

        expect(downText).toContain('▼ -5 (-4.55%)')
        expect(downText).toContain('#ef232a')
      },
    )

    it(
      'thins x-axis date labels when there are many daily categories',
      () => {
        const manyDays = Array.from({ length: 40 }, (_, i) => ({
          date: `2024-02-${String(i + 1).padStart(2, '0')}`,
          open: 100,
          close: 101,
          low: 99,
          high: 102,
        }))
        const option = transformDataToChartOption(
          manyDays,
          'date',
          '',
          'candlestick',
          { openProp: 'open', closeProp: 'close', lowProp: 'low', highProp: 'high' },
        )

        expect(firstCategoryXAxis(option).axisLabel?.interval).toBe('auto')
      },
    )

    it(
      'should use default property names if options are missing',
      () => {
        // Data using default names: 'open', 'close', 'low', 'high' (which matches the test data above)
        // We pass empty options for props
        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'candlestick',
        )

        expect(option.dataset).toBeDefined()
        expect(Array.isArray(option.dataset)).toBe(true)

        const source = firstDatasetSource(option)

        expect(source).toHaveLength(3)
        expect(source[0]).toEqual({ x: '2023-10-01',
          open: 100,
          close: 110,
          low: 95,
          high: 115 })
      },
    )
  },
)
