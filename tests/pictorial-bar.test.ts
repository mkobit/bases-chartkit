import { describe, it, expect } from 'bun:test'
import { createPictorialBarChartOption, formatTooltip } from '../src/charts/transformers/pictorial-bar'
import type { EChartsOption, PictorialBarSeriesOption } from 'echarts'

// EChartsOption['series'] is a `type`-discriminated union, so this needs no
// cast -- checking the literal `type` narrows the element to PictorialBarSeriesOption.
function pictorialBarSeriesAt(option: EChartsOption, index: number): PictorialBarSeriesOption {
  const all = option.series
  const series = Array.isArray(all) ? all[index] : all
  if (series?.type !== 'pictorialBar') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a pictorialBar series at ${index}, got ${String(series?.type)}`)
  }
  return series
}

// pictorial-bar.ts sets yAxis.type to 'category' under flipAxis (only that
// member has `.type` narrowed for `.data` access), so this checks the real
// discriminant.
function firstCategoryYAxis(option: EChartsOption) {
  const yAxis = Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis
  if (yAxis?.type !== 'category') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a category yAxis, got ${String(yAxis?.type)}`)
  }
  return yAxis
}

describe(
  'createPictorialBarChartOption',
  () => {
    const data = [
      { category: 'A',
        value: 10 },
      { category: 'B',
        value: 20 },
      { category: 'C',
        value: 30 },
    ]

    it(
      'should create a basic pictorial bar chart option',
      () => {
        const option = createPictorialBarChartOption(
          data,
          'category',
          'value',
        )

        expect(option.dataset).toBeDefined()
        // Check for dataset existence before accessing
        if (Array.isArray(option.dataset)) {
          expect(option.dataset.length).toBeGreaterThan(0)
        }
        else {
          expect(option.dataset).toHaveProperty('source')
        }

        expect(option.series).toBeDefined()
        expect(option.series).toHaveLength(1)
        const series = pictorialBarSeriesAt(option, 0)
        expect(series.type).toBe('pictorialBar')
        expect(series.symbol).toBe('circle') // Default
        // Default must repeat: a single non-repeating symbol is stretched by
        // ECharts to fill the whole bar's bounding box, which looks identical
        // to a plain bar (see obsidian-bases-charts-fs4.7).
        expect(series.symbolRepeat).toBe(true)
        // Default must clip: clips repeated symbols at the exact value boundary
        // so bar heights accurately convey data values instead of quantizing.
        expect(series.symbolClip).toBe(true)
      },
    )

    it(
      'should configure symbol options',
      () => {
        const option = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            symbol: 'rect',
            symbolRepeat: true,
            symbolClip: true,
            symbolSize: '50%',
          },
        )

        const series = pictorialBarSeriesAt(option, 0)
        expect(series.symbol).toBe('rect')
        expect(series.symbolRepeat).toBe(true)
        expect(series.symbolClip).toBe(true)
        expect(series.symbolSize).toBe('50%')
      },
    )

    it(
      'should handle string booleans for symbolRepeat',
      () => {
        // Test "true" string
        const optionTrue = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            symbolRepeat: 'true',
          },
        )
        expect(pictorialBarSeriesAt(optionTrue, 0).symbolRepeat).toBe(true)

        // Test "false" string
        const optionFalse = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            symbolRepeat: 'false',
          },
        )
        expect(pictorialBarSeriesAt(optionFalse, 0).symbolRepeat).toBe(false)

        // Test "fixed" string
        const optionFixed = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            symbolRepeat: 'fixed',
          },
        )
        expect(pictorialBarSeriesAt(optionFixed, 0).symbolRepeat).toBe('fixed')
      },
    )

    it(
      'should handle series grouping',
      () => {
        const groupData = [
          { category: 'A',
            value: 10,
            group: 'G1' },
          { category: 'A',
            value: 15,
            group: 'G2' },
          { category: 'B',
            value: 20,
            group: 'G1' },
        ]

        const option = createPictorialBarChartOption(
          groupData,
          'category',
          'value',
          {
            seriesProp: 'group',
          },
        )

        expect(option.series).toHaveLength(2) // G1 and G2
        expect(pictorialBarSeriesAt(option, 0).type).toBe('pictorialBar')
        expect(pictorialBarSeriesAt(option, 1).type).toBe('pictorialBar')
      },
    )

    it(
      'should handle flipAxis',
      () => {
        const option = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            flipAxis: true,
          },
        )

        const series = pictorialBarSeriesAt(option, 0)
        expect(series.encode).toEqual({ x: 'y',
          y: 'x',
          tooltip: ['x',
            'y',
            's'] })

        // yAxis should be category
        const yAxis = firstCategoryYAxis(option)

        expect(yAxis.type).toBe('category')
      },
    )

    it(
      'should respect symbolClip: false when explicitly disabled',
      () => {
        const option = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            symbolClip: false,
          },
        )

        const series = pictorialBarSeriesAt(option, 0)
        expect(series.symbolClip).toBe(false)
      },
    )

    it(
      'should support diamond and roundRect symbols',
      () => {
        const optionDiamond = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            symbol: 'diamond',
          },
        )
        expect(pictorialBarSeriesAt(optionDiamond, 0).symbol).toBe('diamond')

        const optionRoundRect = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            symbol: 'roundRect',
          },
        )
        expect(pictorialBarSeriesAt(optionRoundRect, 0).symbol).toBe('roundRect')
      },
    )

    it(
      'should handle boolean values for symbolRepeat',
      () => {
        const optionTrue = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            symbolRepeat: true,
          },
        )
        expect(pictorialBarSeriesAt(optionTrue, 0).symbolRepeat).toBe(true)

        const optionFalse = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            symbolRepeat: false,
          },
        )
        expect(pictorialBarSeriesAt(optionFalse, 0).symbolRepeat).toBe(false)
      },
    )

    it(
      'should handle numeric symbolSize',
      () => {
        const option = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            symbolSize: 24,
          },
        )
        expect(pictorialBarSeriesAt(option, 0).symbolSize).toBe(24)
      },
    )
  },
)

describe(
  'formatTooltip',
  () => {
    it(
      'should format tooltip with category, series name, and value',
      () => {
        const result = formatTooltip({
          seriesName: 'Spend',
          marker: '<span class="dot"></span>',
          value: {
            x: 'Engineering',
            y: 125000,
            s: 'Spend',
            rowIndex: 0,
          },
        })

        expect(result).toBe('<b>Engineering</b><br/><span class="dot"></span>Spend: 125,000')
      },
    )

    it(
      'should fall back to row.s when seriesName is omitted',
      () => {
        const result = formatTooltip({
          value: {
            x: 'Sales',
            y: 95000,
            s: 'Spend',
            rowIndex: 1,
          },
        })

        expect(result).toBe('<b>Sales</b><br/>Spend: 95,000')
      },
    )

    it(
      'should format multiple series lines for array params',
      () => {
        const result = formatTooltip([
          {
            seriesName: 'Actual',
            value: {
              x: 'Marketing',
              y: 50000,
              s: 'Actual',
              rowIndex: 0,
            },
          },
          {
            seriesName: 'Budget',
            value: {
              x: 'Marketing',
              y: 60000,
              s: 'Budget',
              rowIndex: 1,
            },
          },
        ])

        expect(result).toBe('<b>Marketing</b><br/>Actual: 50,000<br/>Budget: 60,000')
      },
    )

    it(
      'should format null values as a dash',
      () => {
        const result = formatTooltip({
          seriesName: 'Spend',
          value: {
            x: 'Operations',
            y: null,
            s: 'Spend',
            rowIndex: 0,
          },
        })

        expect(result).toBe('<b>Operations</b><br/>Spend: -')
      },
    )

    it(
      'should return empty string when given no valid rows',
      () => {
        const result = formatTooltip([])
        expect(result).toBe('')

        const invalidResult = formatTooltip({
          seriesName: 'Spend',
          value: 'invalid',
        })
        expect(invalidResult).toBe('')
      },
    )
  },
)
