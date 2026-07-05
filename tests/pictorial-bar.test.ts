import { describe, it, expect } from 'bun:test'
import { createPictorialBarChartOption } from '../src/charts/transformers/pictorial-bar'
import type { PictorialBarSeriesOption } from 'echarts'

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

        const series = option.series as PictorialBarSeriesOption[]
        expect(series).toBeDefined()
        expect(series.length).toBe(1)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].type).toBe('pictorialBar')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].symbol).toBe('circle') // Default
        // Default must repeat: a single non-repeating symbol is stretched by
        // ECharts to fill the whole bar's bounding box, which looks identical
        // to a plain bar (see obsidian-bases-charts-fs4.7).
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].symbolRepeat).toBe(true)
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

        const series = option.series as PictorialBarSeriesOption[]
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].symbol).toBe('rect')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].symbolRepeat).toBe(true)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].symbolClip).toBe(true)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].symbolSize).toBe('50%')
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
        const seriesTrue = optionTrue.series as PictorialBarSeriesOption[]
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(seriesTrue[0].symbolRepeat).toBe(true)

        // Test "false" string
        const optionFalse = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            symbolRepeat: 'false',
          },
        )
        const seriesFalse = optionFalse.series as PictorialBarSeriesOption[]
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(seriesFalse[0].symbolRepeat).toBe(false)

        // Test "fixed" string
        const optionFixed = createPictorialBarChartOption(
          data,
          'category',
          'value',
          {
            symbolRepeat: 'fixed',
          },
        )
        const seriesFixed = optionFixed.series as PictorialBarSeriesOption[]
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(seriesFixed[0].symbolRepeat).toBe('fixed')
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

        const series = option.series as PictorialBarSeriesOption[]
        expect(series.length).toBe(2) // G1 and G2
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].type).toBe('pictorialBar')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[1].type).toBe('pictorialBar')
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

        const series = option.series as PictorialBarSeriesOption[]
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].encode).toEqual({ x: 'y',
          y: 'x',
          tooltip: ['x',
            'y',
            's'] })

        // yAxis should be category
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const yAxis = option.yAxis as any

        expect(yAxis.type).toBe('category')
      },
    )
  },
)
