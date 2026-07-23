import { describe, it, expect } from 'bun:test'
import { createEffectScatterChartOption } from '../../../src/charts/transformers/effect-scatter'
import type { EffectScatterSeriesOption } from 'echarts'

describe(
  'createEffectScatterChartOption',
  () => {
    const data = [
      { category: 'A',
        value: 10,
        series: 'S1',
        size: 5 },
      { category: 'B',
        value: 20,
        series: 'S1',
        size: 10 },
      { category: 'A',
        value: 15,
        series: 'S2',
        size: 15 },
      { category: 'B',
        value: 25,
        series: 'S2',
        size: 20 },
    ]

    it(
      'should create basic effect scatter chart options',
      () => {
        const option = createEffectScatterChartOption(
          data,
          'category',
          'value',
          {
            seriesProp: 'series',
          },
        )

        expect(option.series).toHaveLength(2) // S1, S2
        const series = option.series as readonly EffectScatterSeriesOption[]
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].type).toBe('effectScatter')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].name).toBe('S1')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[1].type).toBe('effectScatter')
      },
    )

    it(
      'should normalize size property through a visualMap instead of using it as raw pixel size',
      () => {
        const option = createEffectScatterChartOption(
          data,
          'category',
          'value',
          {
            sizeProp: 'size',
          },
        )

        const visualMap = option.visualMap as { min?: number, max?: number, inRange?: { symbolSize?: readonly number[] } }
        expect(visualMap).toBeDefined()
        // data's `size` values range 5-20 -- asserting these are carried
        // through confirms the mapping is data-driven, not a hardcoded range.
        expect(visualMap.min).toBe(5)
        expect(visualMap.max).toBe(20)
        expect(visualMap.inRange?.symbolSize).toEqual([10,
          50])

        // With a visualMap in place, symbolSize is resolved by ECharts from
        // the visualMap, not by a per-series callback echoing the raw value
        // straight through as pixel size (the bug this test used to pin).
        const series = option.series as readonly EffectScatterSeriesOption[]
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].symbolSize).toBeUndefined()
      },
    )

    it(
      'should handle axis labels',
      () => {
        const option = createEffectScatterChartOption(
          data,
          'category',
          'value',
          {
            xAxisLabel: 'Cat',
            yAxisLabel: 'Val',
          },
        )

        expect((option.xAxis as any).name).toBe('Cat')
        expect((option.yAxis as any).name).toBe('Val')
      },
    )

    it(
      'should hide overlapping x-axis labels (large numeric categories)',
      () => {
        const option = createEffectScatterChartOption(
          data,
          'category',
          'value',
        )

        expect((option.xAxis as any).axisLabel?.hideOverlap).toBe(true)
      },
    )
  },
)
