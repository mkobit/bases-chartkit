import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { PieSeriesOption, DatasetComponentOption } from 'echarts'

describe(
  'Transformer: Pie',
  () => {
    it(
      'should create basic pie series from name and value data',
      () => {
        const data = [
          { name: 'A',
            value: 10 },
          { name: 'B',
            value: 20 },
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'pie',
        )

        expect(option.series).toBeDefined()
        expect(Array.isArray(option.series)).toBe(true)
        if (!Array.isArray(option.series)) {
          return
        }
        expect(option.series).toHaveLength(1)

        const series = option.series[0] as PieSeriesOption
        expect(series.type).toBe('pie')

        expect(option.dataset).toBeDefined()
        expect(Array.isArray(option.dataset)).toBe(true)
        if (!Array.isArray(option.dataset)) {
          return
        }
        const dataset = option.dataset[0] as DatasetComponentOption

        const source = dataset.source as ReadonlyArray<{ readonly name: string, readonly value: number }>
        expect(source).toHaveLength(2)
        expect(source[0]).toEqual({ name: 'A',
          value: 10 })
        expect(source[1]).toEqual({ name: 'B',
          value: 20 })
      },
    )

    it(
      'should handle multiple categories',
      () => {
        const data = [
          { cat: 'Cat1',
            val: 100 },
          { cat: 'Cat2',
            val: 200 },
          { cat: 'Cat3',
            val: 300 },
        ]

        const option = transformDataToChartOption(
          data,
          'cat',
          'val',
          'pie',
        )

        expect(Array.isArray(option.dataset)).toBe(true)
        if (!Array.isArray(option.dataset)) {
          return
        }
        const dataset = option.dataset[0] as DatasetComponentOption
        const source = dataset.source as ReadonlyArray<{ readonly name: string, readonly value: number }>

        expect(source).toHaveLength(3)
        expect(source[0]?.name).toBe('Cat1')
        expect(source[1]?.name).toBe('Cat2')
        expect(source[2]?.name).toBe('Cat3')
      },
    )

    it(
      'should handle empty data set gracefully',
      () => {
        const data: Record<string, unknown>[] = []
        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'pie',
        )

        expect(Array.isArray(option.series)).toBe(true)
        expect(Array.isArray(option.dataset)).toBe(true)
        if (!Array.isArray(option.dataset) || !Array.isArray(option.series)) {
          return
        }

        const dataset = option.dataset[0] as DatasetComponentOption
        const source = dataset.source as ReadonlyArray<unknown>
        expect(source).toHaveLength(0)

        const series = option.series[0] as PieSeriesOption
        expect(series.type).toBe('pie')
      },
    )

    it(
      'should handle numeric vs string values and coerce properly',
      () => {
        const data = [
          { name: 123,
            value: '456' }, // name is number, value is string
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'pie',
        )

        expect(Array.isArray(option.dataset)).toBe(true)
        if (!Array.isArray(option.dataset)) {
          return
        }
        const dataset = option.dataset[0] as DatasetComponentOption
        const source = dataset.source as ReadonlyArray<{ readonly name: string, readonly value: number }>

        expect(source).toHaveLength(1)
        expect(source[0]).toEqual({ name: '123',
          value: 456 })
      },
    )

    it(
      'should handle missing or null values',
      () => {
        const data = [
          { name: null,
            value: undefined },
          { name: undefined,
            value: null },
          { missingName: 'Test',
            missingValue: 123 }, // properties don't match
        ]

        const option = transformDataToChartOption(
          data,
          'name',
          'value',
          'pie',
        )

        expect(Array.isArray(option.dataset)).toBe(true)
        if (!Array.isArray(option.dataset)) {
          return
        }
        const dataset = option.dataset[0] as DatasetComponentOption
        const source = dataset.source as ReadonlyArray<{ readonly name: string, readonly value: number }>

        // All three rows fall back to name 'Unknown', so they aggregate into
        // a single slice rather than three separate 'Unknown' slices.
        expect(source).toHaveLength(1)
        expect(source[0]).toEqual({ name: 'Unknown',
          value: 0 })
      },
    )

    it(
      'should aggregate duplicate categories by summing their values',
      () => {
        const data = [
          { region: 'North',
            revenue: 100 },
          { region: 'South',
            revenue: 50 },
          { region: 'North',
            revenue: 75 },
        ]

        const option = transformDataToChartOption(
          data,
          'region',
          'revenue',
          'pie',
        )

        expect(Array.isArray(option.dataset)).toBe(true)
        if (!Array.isArray(option.dataset)) {
          return
        }
        const dataset = option.dataset[0] as DatasetComponentOption
        const source = dataset.source as ReadonlyArray<{ readonly name: string, readonly value: number }>

        expect(source).toHaveLength(2)
        expect(source[0]).toEqual({ name: 'North',
          value: 175 })
        expect(source[1]).toEqual({ name: 'South',
          value: 50 })
      },
    )

    it(
      'should apply roseType option if provided',
      () => {
        const data = [
          { name: 'A',
            value: 10 },
        ]

        const optionRadius = transformDataToChartOption(
          data,
          'name',
          'value',
          'pie',
          { roseType: 'radius' },
        )

        expect(Array.isArray(optionRadius.series)).toBe(true)
        if (!Array.isArray(optionRadius.series)) {
          return
        }
        const seriesRadius = optionRadius.series[0] as PieSeriesOption
        // @ts-ignore
        expect(seriesRadius.roseType).toBe('radius')
        expect(seriesRadius.radius).toEqual([20,
          '75%'])

        const optionArea = transformDataToChartOption(
          data,
          'name',
          'value',
          'pie',
          { roseType: 'area' },
        )

        expect(Array.isArray(optionArea.series)).toBe(true)
        if (!Array.isArray(optionArea.series)) {
          return
        }
        const seriesArea = optionArea.series[0] as PieSeriesOption
        // @ts-ignore
        expect(seriesArea.roseType).toBe('area')
      },
    )

    it(
      'should apply showLegend option if true',
      () => {
        const data = [
          { name: 'A',
            value: 10 },
        ]

        const optionWithoutLegend = transformDataToChartOption(
          data,
          'name',
          'value',
          'pie',
          { legend: false },
        )
        expect(optionWithoutLegend.legend).toBeUndefined()

        const optionWithLegend = transformDataToChartOption(
          data,
          'name',
          'value',
          'pie',
          { legend: true },
        )
        expect(optionWithLegend.legend).toBeDefined()
        // @ts-ignore
        expect(optionWithLegend.legend.type).toBe('scroll')
      },
    )
  },
)
