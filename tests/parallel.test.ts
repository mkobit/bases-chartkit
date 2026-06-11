import { describe, it, expect } from 'bun:test'
import { createParallelChartOption } from '../src/charts/transformers/parallel'

// Define a minimal interface for the test expectations to avoid "unsafe member access" errors
interface TestParallelAxis {
  readonly name: string
  readonly type: string
  readonly data?: readonly string[]
}

interface TestSeries {
  readonly name: string
  readonly type: string
  readonly data: readonly unknown[]
}

interface TestOption {
  readonly parallel?: unknown
  readonly parallelAxis?: readonly TestParallelAxis[]
  readonly series?: readonly TestSeries[]
  readonly title?: { readonly text: string }
}

describe(
  'createParallelChartOption',
  () => {
    it(
      'should create a basic parallel chart option',
      () => {
        const data = [
          { id: 1,
            price: 100,
            rating: 4.5,
            volume: 50 },
          { id: 2,
            price: 200,
            rating: 3.5,
            volume: 30 },
        ]
        const dimensions = 'price, rating, volume'

        const option = createParallelChartOption(
          data,
          dimensions,
        ) as TestOption

        expect(option.parallel).toBeDefined()

        const axes = option.parallelAxis
        expect(axes).toBeDefined()
        // Use type assertions or early returns (in test logic, direct assertion is better)
        expect(axes).toHaveLength(3)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(axes[0].name).toBe('price')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(axes[0].type).toBe('value')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(axes[1].name).toBe('rating')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(axes[2].name).toBe('volume')

        expect(Array.isArray(option.series)).toBe(true)
        expect(option.series).toHaveLength(1) // Default series
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(option.series[0].data).toHaveLength(2)
      },
    )

    it(
      'should handle category dimensions',
      () => {
        const data = [
          { name: 'A',
            value: 10 },
          { name: 'B',
            value: 20 },
        ]
        const dimensions = 'name, value'

        const option = createParallelChartOption(
          data,
          dimensions,
        ) as TestOption
        const axes = option.parallelAxis
        expect(axes).toBeDefined()

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(axes[0].name).toBe('name')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(axes[0].type).toBe('category')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(axes[0].data).toEqual(expect.arrayContaining(['A',
          'B']))

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(axes[1].name).toBe('value')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(axes[1].type).toBe('value')
      },
    )

    it(
      'should handle grouping by seriesProp',
      () => {
        const data = [
          { group: 'G1',
            x: 1,
            y: 1 },
          { group: 'G1',
            x: 2,
            y: 2 },
          { group: 'G2',
            x: 3,
            y: 3 },
        ]
        const dimensions = 'x, y'
        const options = { seriesProp: 'group' }

        const option = createParallelChartOption(
          data,
          dimensions,
          options,
        ) as TestOption

        expect(option.series).toHaveLength(2)
        // @ts-expect-error - suppress strictNullChecks in tests
        const s1 = option.series.find(s => s.name === 'G1')
        // @ts-expect-error - suppress strictNullChecks in tests
        const s2 = option.series.find(s => s.name === 'G2')

        expect(s1).toBeDefined()
        expect(s1?.data).toHaveLength(2)
        expect(s2).toBeDefined()
        expect(s2?.data).toHaveLength(1)
      },
    )

    it(
      'should handle empty data with valid dimensions',
      () => {
        const option = createParallelChartOption(
          [],
          'price',
        ) as TestOption
        expect(option.parallel).toBeDefined()

        const axes = option.parallelAxis
        expect(axes).toBeDefined()
        expect(axes).toHaveLength(1)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(axes[0].name).toBe('price')
        // Defaults to category if no data to infer value
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(axes[0].type).toBe('category')
      },
    )

    it(
      'should return title message if no dimensions provided',
      () => {
        const option = createParallelChartOption(
          [],
          '',
        ) as TestOption
        expect(option.title).toBeDefined()
        expect(option.title?.text).toContain('No dimensions')
      },
    )
  },
)
