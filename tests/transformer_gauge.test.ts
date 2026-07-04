import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { GaugeSeriesOption } from 'echarts'
import type { GaugeTransformerOptions } from '../src/charts/transformers/gauge'

describe(
  'Transformer: Gauge',
  () => {
    it(
      'should sum all values into a single total from data',
      () => {
        const data = [
          { value: 10 },
          { value: 20 },
          { value: 15 },
        ]

        const option = transformDataToChartOption(
          data,
          '',
          'value',
          'gauge',
        )

        expect(option.series).toBeDefined()
        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }
        expect(option.series).toHaveLength(1)

        const series = option.series[0] as GaugeSeriesOption
        expect(series.type).toBe('gauge')
        expect(series.data).toBeDefined()

        // @ts-expect-error - suppress strictNullChecks in tests
        const seriesData = series.data[0]
        // @ts-expect-error - value property access
        expect(seriesData.value).toBe(45)
        // @ts-expect-error - name property access
        expect(seriesData.name).toBe('value')
      },
    )

    it(
      'should skip NaN values and not add them to total',
      () => {
        const data = [
          { val: 10 },
          { val: 'invalid' },
          { val: 30 },
          { val: undefined },
        ]

        const option = transformDataToChartOption(
          data,
          '',
          'val',
          'gauge',
        )

        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }

        const series = option.series[0] as GaugeSeriesOption
        // @ts-expect-error - suppress strictNullChecks in tests
        const seriesData = series.data[0]
        // @ts-expect-error - value property access
        expect(seriesData.value).toBe(40)
      },
    )

    it(
      'should result in a total of 0 for empty data',
      () => {
        const data: readonly Record<string, unknown>[] = []

        const option = transformDataToChartOption(
          data,
          '',
          'count',
          'gauge',
        )

        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }

        const series = option.series[0] as GaugeSeriesOption
        // @ts-expect-error - suppress strictNullChecks in tests
        const seriesData = series.data[0]
        // @ts-expect-error - value property access
        expect(seriesData.value).toBe(0)
      },
    )

    it(
      'should apply custom min/max options',
      () => {
        const data = [
          { val: 50 },
        ]

        const options: GaugeTransformerOptions = {
          min: -100,
          max: 200,
        }

        const chartOption = transformDataToChartOption(
          data,
          '',
          'val',
          'gauge',
          options,
        )

        expect(Array.isArray(chartOption.series)).toBe(true)
        if (!Array.isArray(chartOption.series)) {
          return
        }

        const series = chartOption.series[0] as GaugeSeriesOption
        expect(series.min).toBe(-100)
        expect(series.max).toBe(200)
      },
    )

    it(
      'should default min=0 and max=100 when options omitted',
      () => {
        const data = [
          { val: 75 },
        ]

        const option = transformDataToChartOption(
          data,
          '',
          'val',
          'gauge',
        )

        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }

        const series = option.series[0] as GaugeSeriesOption
        expect(series.min).toBe(0)
        expect(series.max).toBe(100)
      },
    )

    it(
      'should use yAxisLabel as the data point name instead of the raw prop key',
      () => {
        // Regression (fs4.11): the gauge view never resolved a friendly
        // display name, so the data point name always fell back to the raw
        // property path (e.g. 'note.Load' instead of 'Load').
        const data = [{ val: 50 }]

        const option = transformDataToChartOption(
          data,
          '',
          'val',
          'gauge',
          { yAxisLabel: 'Load' },
        )

        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }

        const series = option.series[0] as GaugeSeriesOption
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.data[0].name).toBe('Load')
      },
    )

    it(
      'should fall back to the raw prop key when yAxisLabel is not provided',
      () => {
        const data = [{ val: 50 }]

        const option = transformDataToChartOption(
          data,
          '',
          'val',
          'gauge',
        )

        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }

        const series = option.series[0] as GaugeSeriesOption
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.data[0].name).toBe('val')
      },
    )
  },
)
