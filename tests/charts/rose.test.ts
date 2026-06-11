import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../../src/charts/transformer'
import type { PieSeriesOption, DatasetComponentOption } from 'echarts'

describe(
  'Rose Chart Transformer',
  () => {
    it(
      'should create a rose chart with roseType: area',
      () => {
        const data = [
          { category: 'A',
            value: 10 },
          { category: 'B',
            value: 20 },
        ]

        const option = transformDataToChartOption(
          data,
          'category',
          'value',
          'rose',
        ) as unknown as { readonly series: readonly PieSeriesOption[]
          readonly dataset: readonly { source: readonly unknown[] }[] }

        expect(option.series).toBeDefined()
        expect(option.series).toHaveLength(1)

        const [series] = option.series
        expect(series).toBeDefined()
        if (!series) {
          return
        }

        expect(series.type).toBe('pie')
        expect(series.roseType).toBe('area')
        expect(series.radius).toEqual([20,
          '75%'])
      },
    )

    it(
      'should map data correctly via dataset',
      () => {
        const data = [
          { category: 'A',
            value: 10 },
          { category: 'B',
            value: 20 },
        ]

        const option = transformDataToChartOption(
          data,
          'category',
          'value',
          'rose',
        ) as unknown as { readonly series: readonly PieSeriesOption[]
          readonly dataset: readonly DatasetComponentOption[] }
        const [series] = option.series
        if (!series) {
          expect(series).toBeDefined()
          return
        }

        expect(series.datasetIndex).toBe(0)
        expect(option.dataset).toBeDefined()

        // @ts-expect-error - suppress strictNullChecks in tests
        const source = option.dataset[0].source
        expect(source).toHaveLength(2)
        expect(source).toEqual([
          { name: 'A',
            value: 10 },
          { name: 'B',
            value: 20 },
        ])
      },
    )
  },
)
