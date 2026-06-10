import { describe, it, expect } from 'bun:test'
import { createParetoChartOption } from '../../../src/charts/transformers/pareto'
import type { DatasetComponentOption, BarSeriesOption, LineSeriesOption, YAXisComponentOption, XAXisComponentOption } from 'echarts'

describe(
  'createParetoChartOption',
  () => {
    const data = [
      { category: 'A',
        value: 10 },
      { category: 'B',
        value: 40 },
      { category: 'C',
        value: 30 },
      { category: 'D',
        value: 20 },
    ]

    it(
      'should sort data by value descending',
      () => {
        const option = createParetoChartOption(
          data,
          'category',
          'value',
        )
        const dataset = option.dataset as DatasetComponentOption
        const source = dataset.source as { name: string
          value: number
          cumulative: number }[]

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[0].name).toBe('B')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[0].value).toBe(40)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[1].name).toBe('C')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[1].value).toBe(30)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[2].name).toBe('D')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[2].value).toBe(20)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[3].name).toBe('A')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[3].value).toBe(10)
      },
    )

    it(
      'should calculate cumulative percentage correctly',
      () => {
        const option = createParetoChartOption(
          data,
          'category',
          'value',
        )
        const dataset = option.dataset as DatasetComponentOption
        const source = dataset.source as { name: string
          value: number
          cumulative: number }[]

        // Total = 100
        // B: 40 -> 40%
        // C: 30 -> 70%
        // D: 20 -> 90%
        // A: 10 -> 100%

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[0].cumulative).toBe(40)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[1].cumulative).toBe(70)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[2].cumulative).toBe(90)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[3].cumulative).toBe(100)
      },
    )

    it(
      'should configure dual y-axes',
      () => {
        const option = createParetoChartOption(
          data,
          'category',
          'value',
        )
        // Cast to specific array type to satisfy linter and typescript
        const yAxis = option.yAxis as YAXisComponentOption[]

        expect(yAxis).toHaveLength(2)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(yAxis[0].name).toBe('value')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(yAxis[1].name).toBe('Cumulative %')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(yAxis[1].min).toBe(0)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(yAxis[1].max).toBe(100)
      },
    )

    it(
      'should configure bar and line series on correct axes',
      () => {
        const option = createParetoChartOption(
          data,
          'category',
          'value',
        )
        const series = option.series as (BarSeriesOption | LineSeriesOption)[]

        expect(series).toHaveLength(2)

        const barSeries = series[0] as BarSeriesOption
        expect(barSeries.type).toBe('bar')
        expect(barSeries.yAxisIndex).toBe(0)
        expect(barSeries.encode).toEqual({ x: 'name',
          y: 'value' })

        const lineSeries = series[1] as LineSeriesOption
        expect(lineSeries.type).toBe('line')
        expect(lineSeries.yAxisIndex).toBe(1)
        expect(lineSeries.encode).toEqual({ x: 'name',
          y: 'cumulative' })
      },
    )

    it(
      'should handle custom axis labels',
      () => {
        const option = createParetoChartOption(
          data,
          'category',
          'value',
          {
            xAxisLabel: 'Cat',
            yAxisLabel: 'Val',
          },
        )

        // Cast to XAXisComponentOption (can be array or object, but here it's object)
        const xAxis = option.xAxis as XAXisComponentOption
        // Cast to YAXisComponentOption[]
        const yAxis = option.yAxis as YAXisComponentOption[]

        expect(xAxis.name).toBe('Cat')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(yAxis[0].name).toBe('Val')
      },
    )

    it(
      'should filter out invalid values',
      () => {
        const dirtyData = [
          { category: 'A',
            value: 10 },
          { category: 'B',
            value: 'invalid' },
          { category: 'C',
            value: 20 },
        ]

        const option = createParetoChartOption(
          dirtyData,
          'category',
          'value',
        )
        const dataset = option.dataset as DatasetComponentOption
        const source = dataset.source as { name: string
          value: number
          cumulative: number }[]

        expect(source).toHaveLength(2)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[0].name).toBe('C')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[1].name).toBe('A')

        // C: 20 (66.6%), A: 10 (100%) - Total 30
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[0].cumulative).toBeCloseTo(
          66.666,
          2,
        )
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(source[1].cumulative).toBeCloseTo(
          100,
          2,
        )
      },
    )
  },
)
