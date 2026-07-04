import { describe, it, expect } from 'bun:test'
import { createBulletChartOption } from '../../../src/charts/transformers/bullet'
import type { BarSeriesOption, ScatterSeriesOption, DatasetComponentOption } from 'echarts'

describe(
  'createBulletChartOption',
  () => {
    const data = [
      { category: 'A',
        value: 10,
        target: 12,
        low: 5,
        mid: 15,
        high: 20 },
      { category: 'B',
        value: 20,
        target: 18,
        low: 10,
        mid: 25,
        high: 30 },
      { category: 'C',
        value: 15 }, // Missing target and ranges
      { category: 'D',
        value: null,
        target: 10 },
    ]

    it(
      'should create a bullet chart with bar and scatter series',
      () => {
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          { targetProp: 'target' },
        )

        expect(option.series).toHaveLength(2)
        const [barSeries,
          scatterSeries] = option.series as [BarSeriesOption, ScatterSeriesOption]

        expect(barSeries.type).toBe('bar')
        expect(barSeries.encode).toEqual({ x: 'x',
          y: 'y' })
        expect(barSeries.barWidth).toBe('60%')

        expect(scatterSeries.type).toBe('scatter')
        expect(scatterSeries.encode).toEqual({ x: 'x',
          y: 't' })
        expect(scatterSeries.symbol).toBe('rect')
        expect(scatterSeries.symbolSize).toEqual([40,
          4]) // Default vertical bar, horizontal marker
      },
    )

    it(
      'should create range series when range props are provided',
      () => {
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          {
            targetProp: 'target',
            rangeLowProp: 'low',
            rangeMidProp: 'mid',
            rangeHighProp: 'high',
          },
        )

        expect(option.series).toHaveLength(5) // 3 ranges + 1 measure + 1 target
        const series = option.series as BarSeriesOption[]

        const range1 = series[0]
        const range2 = series[1]
        const range3 = series[2]
        const measure = series[3]

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(range1.stack).toBe('range')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(range1.z).toBe(0)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(range1.itemStyle?.color).toBe('#e0e0e0')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(range1.encode).toEqual({ x: 'x',
          y: 'r1' })

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(range2.stack).toBe('range')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(range2.z).toBe(0)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(range2.itemStyle?.color).toBe('#bdbdbd')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(range2.encode).toEqual({ x: 'x',
          y: 'r2' })

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(range3.stack).toBe('range')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(range3.z).toBe(0)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(range3.itemStyle?.color).toBe('#9e9e9e')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(range3.encode).toEqual({ x: 'x',
          y: 'r3' })

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(measure.z).toBe(2)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(measure.barGap).toBe('-100%')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(measure.barWidth).toBe('40%')
      },
    )

    it(
      'should calculate range deltas correctly',
      () => {
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          {
            rangeLowProp: 'low',
            rangeMidProp: 'mid',
            rangeHighProp: 'high',
          },
        )

        const dataset = option.dataset as DatasetComponentOption[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const source = (dataset[0] as DatasetComponentOption).source as any[]

        // A: low=5, mid=15, high=20
        // r1=5, r2=10 (15-5), r3=5 (20-15)
        expect(source[0]).toEqual(expect.objectContaining({
          r1: 5,
          r2: 10,
          r3: 5,
        }))
      },
    )

    it(
      'should use yAxisLabel as the measure series name instead of the raw prop key',
      () => {
        // Regression (fs4.11): bullet uses VALUE_PROP_KEY (not
        // Y_AXIS_PROP_KEY), so the view's common-options helper never
        // resolved a display name for it, and the series name always fell
        // back to the raw property path (e.g. 'note.Value' instead of
        // 'Value').
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          { yAxisLabel: 'Value' },
        )

        const series = option.series as BarSeriesOption[]
        const measure = series[0]
        expect(measure.name).toBe('Value')
      },
    )

    it(
      'should fall back to the raw prop key when yAxisLabel is not provided',
      () => {
        const option = createBulletChartOption(
          data,
          'category',
          'value',
        )

        const series = option.series as BarSeriesOption[]
        const measure = series[0]
        expect(measure.name).toBe('value')
      },
    )

    it(
      'should handle flipped axis with ranges',
      () => {
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          {
            targetProp: 'target',
            flipAxis: true,
            rangeLowProp: 'low',
          },
        )

        // Series: r1, r2, r3 (created even if undefined props, just empty), measure, target
        // Actually code checks hasRanges = rangeLow || rangeMid || rangeHigh.
        // So 3 range series created.

        expect(option.series).toHaveLength(5)
        const [r1, , , measure,
          target] = option.series as [BarSeriesOption, BarSeriesOption, BarSeriesOption, BarSeriesOption, ScatterSeriesOption]

        expect(r1.encode).toEqual({ x: 'r1',
          y: 'x' })
        expect(measure.encode).toEqual({ x: 'y',
          y: 'x' })
        expect(target.symbolSize).toEqual([4,
          30]) // Horizontal bar, vertical marker
      },
    )
  },
)
