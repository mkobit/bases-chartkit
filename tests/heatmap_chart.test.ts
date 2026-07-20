import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { DatasetComponentOption } from 'echarts'

interface HeatmapSourceItem {
  readonly x: string
  readonly y: string
  readonly value: number
}

describe(
  'Heatmap Transformer',
  () => {
    it(
      'should create a valid heatmap option',
      () => {
        const data = [
          { x: 'Mon',
            y: 'Morning',
            val: 5 },
          { x: 'Mon',
            y: 'Evening',
            val: 10 },
          { x: 'Tue',
            y: 'Morning',
            val: 2 },
          { x: 'Tue',
            y: 'Evening',
            val: 20 },
        ]

        const option = transformDataToChartOption(
          data,
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )

        expect(option).toBeDefined()
        // Check X Axis
        const xAxis = option.xAxis as any

        expect(xAxis.type).toBe('category')

        expect(xAxis.data).toContain('Mon')

        expect(xAxis.data).toContain('Tue')

        // Check Y Axis
        const yAxis = option.yAxis as any

        expect(yAxis.type).toBe('category')

        expect(yAxis.data).toContain('Morning')

        expect(yAxis.data).toContain('Evening')

        // Check Series
        const series = option.series as readonly any[]
        expect(series).toHaveLength(1)

        expect(series[0]?.type).toBe('heatmap')

        // Check Data Mapping

        expect(series[0].datasetIndex).toBe(0)
        const dataset = option.dataset as readonly DatasetComponentOption[]
        expect(dataset).toBeDefined()

        // @ts-expect-error - suppress strictNullChecks in tests
        const source = dataset[0].source as readonly HeatmapSourceItem[]
        expect(source).toHaveLength(4)
        expect(source[0]).toEqual({ x: 'Mon',
          y: 'Morning',
          value: 5 })
      },
    )

    it(
      'should handle missing values gracefully',
      () => {
        const data = [
          { x: 'Mon',
            y: 'Morning',
            val: 5 },
          { x: 'Mon',
            y: 'Evening' }, // Missing val
        ]

        const option = transformDataToChartOption(
          data,
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )
        const dataset = option.dataset as readonly DatasetComponentOption[]

        // @ts-expect-error - suppress strictNullChecks in tests
        const source = dataset[0].source as readonly HeatmapSourceItem[]

        // Should produce 0 for missing value based on current logic
        const missingPoint = source.find(d => d.value === 0)
        expect(missingPoint).toBeDefined()
      },
    )

    it(
      'should format cell labels from dataset-encoded params instead of showing a bare dash',
      () => {
        // Regression: ECharts can't derive a default label from our
        // dataset+encode series (only from raw [x, y, value] tuples) —
        // without an explicit formatter every cell rendered '-'.
        const data = [
          { x: 'Mon',
            y: 'Morning',
            val: 5 },
        ]

        const option = transformDataToChartOption(
          data,
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )
        const series = option.series as any
        const formatter = series[0].label.formatter as (params: unknown) => string

        expect(formatter({ value: { x: 'Mon', y: 'Morning', value: 5 } })).toBe('5')
        expect(formatter({ value: undefined })).toBe('')
      },
    )

    it(
      'should calculate visualMap min/max correctly',
      () => {
        const data = [
          { x: 'A',
            y: '1',
            val: 10 },
          { x: 'B',
            y: '2',
            val: 100 },
        ]

        const option = transformDataToChartOption(
          data,
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )
        const visualMap = option.visualMap as any

        expect(visualMap.min).toBe(10)

        expect(visualMap.max).toBe(100)
      },
    )
  },
)
