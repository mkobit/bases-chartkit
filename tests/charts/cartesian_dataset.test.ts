import { describe, it, expect } from 'bun:test'
import { createCartesianChartOption } from '../../src/charts/transformers/cartesian'
import type { DatasetComponentOption, SeriesOption } from 'echarts'

describe(
  'Cartesian Chart Transformer (Dataset Architecture)',
  () => {
    const data = [
      { date: '2023-01-01',
        value: 10,
        category: 'A' },
      { date: '2023-01-02',
        value: 20,
        category: 'A' },
      { date: '2023-01-01',
        value: 15,
        category: 'B' },
      { date: '2023-01-03',
        value: 25,
        category: 'B' },
    ]

    it(
      'should create a simple bar chart using dataset',
      () => {
        const option = createCartesianChartOption(
          data,
          'date',
          'value',
          'bar',
        )

        expect(option.dataset).toBeDefined()
        // Check source dataset
        const datasets = (Array.isArray(option.dataset) ? option.dataset : [option.dataset]) as readonly DatasetComponentOption[]
        expect(datasets[0]).toHaveProperty('source')

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(datasets[0].source).toHaveLength(4)

        // Check series
        const series = (Array.isArray(option.series) ? option.series[0] : option.series) as SeriesOption
        expect(series).toBeDefined()
        expect(series.type).toBe('bar')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((series as any).datasetIndex).toBeDefined()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((series as any).encode).toEqual({ x: 'x',
          y: 'y',
          tooltip: ['x',
            'y',
            's'] })
      },
    )

    it(
      'should handle series grouping using filter transforms',
      () => {
        const option = createCartesianChartOption(
          data,
          'date',
          'value',
          'line',
          { seriesProp: 'category' },
        )

        expect(option.dataset).toBeDefined()
        const datasets = (Array.isArray(option.dataset) ? option.dataset : [option.dataset]) as readonly DatasetComponentOption[]

        // Should have 1 source + 2 filtered datasets (A and B)
        expect(datasets.length).toBeGreaterThanOrEqual(3)

        // Verify transforms exist
        const transformDatasets = datasets.filter(d => d.transform)
        expect(transformDatasets.length).toBe(2)

        // Explicit check for transform type

        // @ts-expect-error - suppress strictNullChecks in tests
        const t = transformDatasets[0].transform
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((t as any).type).toBe('filter')

        // Verify series reference these datasets
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const series = option.series as readonly any[]
        expect(series).toHaveLength(2)

        expect(series[0].datasetIndex).toBeGreaterThan(0)

        expect(series[1].datasetIndex).toBeGreaterThan(0)
      },
    )

    it(
      'should handle flipAxis correctly',
      () => {
        const option = createCartesianChartOption(
          data,
          'date',
          'value',
          'bar',
          { flipAxis: true },
        )

        const series = Array.isArray(option.series) ? option.series[0] : option.series
        expect(series).toBeDefined()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((option.yAxis as any).type).toBe('category')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((option.xAxis as any).type).toBe('value')
      },
    )
  },
)
