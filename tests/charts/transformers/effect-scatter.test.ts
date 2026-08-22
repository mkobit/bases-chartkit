import { describe, it, expect } from 'bun:test'
import { createEffectScatterChartOption } from '../../../src/charts/transformers/effect-scatter'
import { formatCompactVisualMapLabel } from '../../../src/charts/transformers/utils'
import type { ContinuousVisualMapComponentOption, EChartsOption, EffectScatterSeriesOption } from 'echarts'

// EChartsOption['series'] is a `type`-discriminated union, so checking the
// literal `type` narrows the element to EffectScatterSeriesOption with no cast.
function effectScatterSeriesAt(option: EChartsOption, index: number): EffectScatterSeriesOption {
  const all = option.series
  const series = Array.isArray(all) ? all[index] : all
  if (series?.type !== 'effectScatter') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected an effectScatter series at ${index}, got ${String(series?.type)}`)
  }
  return series
}

// effect-scatter.ts sets xAxis.type to 'category' and yAxis.type to 'value',
// so these check the real discriminants rather than asserting them.
function firstCategoryXAxis(option: EChartsOption) {
  const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
  if (xAxis?.type !== 'category') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a category xAxis, got ${String(xAxis?.type)}`)
  }
  return xAxis
}

function firstValueYAxis(option: EChartsOption) {
  const yAxis = Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis
  if (yAxis?.type !== 'value') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a value yAxis, got ${String(yAxis?.type)}`)
  }
  return yAxis
}

// effect-scatter.ts sets visualMap.type explicitly (defaulting to
// 'continuous'), so this checks the real discriminant rather than asserting it.
function firstContinuousVisualMap(option: EChartsOption): ContinuousVisualMapComponentOption {
  const visualMap = Array.isArray(option.visualMap) ? option.visualMap[0] : option.visualMap
  if (visualMap?.type !== 'continuous') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a continuous visualMap, got ${String(visualMap?.type)}`)
  }
  return visualMap
}

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
        expect(effectScatterSeriesAt(option, 0).type).toBe('effectScatter')
        expect(effectScatterSeriesAt(option, 0).name).toBe('S1')
        expect(effectScatterSeriesAt(option, 1).type).toBe('effectScatter')
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

        const visualMap = firstContinuousVisualMap(option)
        expect(visualMap).toBeDefined()
        // data's `size` values range 5-20 -- asserting these are carried
        // through confirms the mapping is data-driven, not a hardcoded range.
        expect(visualMap.min).toBe(5)
        expect(visualMap.max).toBe(20)
        expect(visualMap.inRange?.symbolSize).toEqual([10,
          50])
        expect(visualMap.formatter).toBe(formatCompactVisualMapLabel)

        // With a visualMap in place, symbolSize is resolved by ECharts from
        // the visualMap, not by a per-series callback echoing the raw value
        // straight through as pixel size (the bug this test used to pin).
        expect(effectScatterSeriesAt(option, 0).symbolSize).toBeUndefined()
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

        expect(firstCategoryXAxis(option).name).toBe('Cat')
        expect(firstValueYAxis(option).name).toBe('Val')
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

        expect(firstCategoryXAxis(option).axisLabel?.hideOverlap).toBe(true)
      },
    )
  },
)
