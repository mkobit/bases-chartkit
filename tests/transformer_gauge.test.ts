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

    describe(
      'aggregation option (fs4.13)',
      () => {
        // Regression: gauge always summed every matching row into one total,
        // with no way to average, which silently blew past a 0-100 scale for
        // rate/percentage metrics (e.g. server load % across several rows).
        const data = [
          { val: 50 },
          { val: 20 },
          { val: 80 },
        ]

        it(
          'should default to sum when aggregation is omitted',
          () => {
            const option = transformDataToChartOption(data, '', 'val', 'gauge')
            const series = (option.series as GaugeSeriesOption[])[0]
            // @ts-expect-error - suppress strictNullChecks in tests
            expect(series.data[0].value).toBe(150)
          },
        )

        it(
          'should average values when aggregation is avg',
          () => {
            const option = transformDataToChartOption(data, '', 'val', 'gauge', { aggregation: 'avg' })
            const series = (option.series as GaugeSeriesOption[])[0]
            // @ts-expect-error - suppress strictNullChecks in tests
            expect(series.data[0].value).toBe(50)
          },
        )

        it(
          'should take the minimum when aggregation is min',
          () => {
            const option = transformDataToChartOption(data, '', 'val', 'gauge', { aggregation: 'min' })
            const series = (option.series as GaugeSeriesOption[])[0]
            // @ts-expect-error - suppress strictNullChecks in tests
            expect(series.data[0].value).toBe(20)
          },
        )

        it(
          'should take the maximum when aggregation is max',
          () => {
            const option = transformDataToChartOption(data, '', 'val', 'gauge', { aggregation: 'max' })
            const series = (option.series as GaugeSeriesOption[])[0]
            // @ts-expect-error - suppress strictNullChecks in tests
            expect(series.data[0].value).toBe(80)
          },
        )

        it(
          'should take the last value when aggregation is last',
          () => {
            const option = transformDataToChartOption(data, '', 'val', 'gauge', { aggregation: 'last' })
            const series = (option.series as GaugeSeriesOption[])[0]
            // @ts-expect-error - suppress strictNullChecks in tests
            expect(series.data[0].value).toBe(80)
          },
        )

        it(
          'should result in 0 for any aggregation when data is empty',
          () => {
            const option = transformDataToChartOption([], '', 'val', 'gauge', { aggregation: 'avg' })
            const series = (option.series as GaugeSeriesOption[])[0]
            // @ts-expect-error - suppress strictNullChecks in tests
            expect(series.data[0].value).toBe(0)
          },
        )
      },
    )
  },
)
