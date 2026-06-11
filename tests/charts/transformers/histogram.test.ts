import { describe, it, expect } from 'bun:test'
import { createHistogramChartOption } from '../../../src/charts/transformers/histogram'
import type { BarSeriesOption } from 'echarts'

describe(
  'createHistogramChartOption',
  () => {
    const data = [
      { value: 1 },
      { value: 2 },
      { value: 2 },
      { value: 3 },
      { value: 10 }, // Outlier to stretch range
    ]

    it(
      'should create a valid histogram option',
      () => {
        const option = createHistogramChartOption(
          data,
          'value',
        )

        expect(option).toBeDefined()
        expect(option.series).toBeDefined()
        expect(option.series).toHaveLength(1)

        const series = (option.series as BarSeriesOption[])[0]
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.type).toBe('bar')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.barCategoryGap).toBe(0)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.data).toBeDefined()

        // Check Sturges calculation
        // n = 5
        // k = ceil(log2(5) + 1) = ceil(2.32 + 1) = ceil(3.32) = 4
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.data).toHaveLength(4)

        // Check bins cover min(1) to max(10)
        // range = 9. width = 9/4 = 2.25
        // Bin 0: 1.00 - 3.25. (1, 2, 2, 3) -> count 4
        // Bin 1: 3.25 - 5.50. () -> count 0
        // Bin 2: 5.50 - 7.75. () -> count 0
        // Bin 3: 7.75 - 10.00. (10) -> count 1

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.data).toEqual([4,
          0,
          0,
          1])
      },
    )

    it(
      'should respect custom binCount',
      () => {
        const option = createHistogramChartOption(
          data,
          'value',
          { binCount: 2 },
        )
        const series = (option.series as BarSeriesOption[])[0]

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.data).toHaveLength(2)
        // range = 9. width = 4.5.
        // Bin 0: 1.0 - 5.5. (1, 2, 2, 3) -> 4
        // Bin 1: 5.5 - 10.0. (10) -> 1
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.data).toEqual([4,
          1])
      },
    )

    it(
      'should respect custom binWidth',
      () => {
        // range 9. binWidth 3.
        // bins should be ceil(9/3) = 3.
        const option = createHistogramChartOption(
          data,
          'value',
          { binWidth: 3 },
        )
        const series = (option.series as BarSeriesOption[])[0]

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.data).toHaveLength(3)
        // Bin 0: 1.00 - 4.00. (1, 2, 2, 3) -> 4
        // Bin 1: 4.00 - 7.00. () -> 0
        // Bin 2: 7.00 - 10.00. (10) -> 1
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.data).toEqual([4,
          0,
          1])
      },
    )

    it(
      'should handle single value (zero range)',
      () => {
        const singleData = [{ value: 5 },
          { value: 5 },
          { value: 5 }]
        const option = createHistogramChartOption(
          singleData,
          'value',
        )
        const series = (option.series as BarSeriesOption[])[0]

        // n=3, k=ceil(log2(3)+1) = ceil(1.58+1) = 3
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.data).toHaveLength(3)
        // range=0 -> safeRange=1 -> binWidth=1/3
        // All values 5.
        // Bin 0: 5 - 5.33. Includes 5?
        // Bin definition: i=0: >= min && < max (or <= max if last)
        // If 3 bins, last is index 2.
        // Bin 0: [5, 5.33). 5 is >= 5. Count 3.
        // Bin 1: [5.33, 5.66). Count 0.
        // Bin 2: [5.66, 6.00]. Count 0.
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.data).toEqual([3,
          0,
          0])
      },
    )

    it(
      'should handle empty data',
      () => {
        const option = createHistogramChartOption(
          [],
          'value',
        )
        expect(option).toEqual({})
      },
    )

    it(
      'should filter non-numeric values',
      () => {
        const mixedData = [
          { value: 1 },
          { value: 'a' },
          { value: null },
          { value: NaN },
          { value: 2 },
        ]
        const option = createHistogramChartOption(
          mixedData,
          'value',
          { binCount: 2 },
        )
        const series = (option.series as BarSeriesOption[])[0]

        // n=2 (1, 2). range=1. width=0.5
        // Bin 0: 1 - 1.5. (1) -> 1
        // Bin 1: 1.5 - 2.0. (2) -> 1
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.data).toEqual([1,
          1])
      },
    )
  },
)
