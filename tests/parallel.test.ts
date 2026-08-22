import { describe, it, expect } from 'bun:test'
import { createParallelChartOption } from '../src/charts/transformers/parallel'
import type { EChartsOption, ParallelSeriesOption } from 'echarts'

// EChartsOption['parallelAxis'] is a single-interface component option (not a
// discriminated union), so this just narrows array-or-single, no cast.
function parallelAxisAt(option: EChartsOption, index: number) {
  const axes = option.parallelAxis
  const axis = Array.isArray(axes) ? axes[index] : axes
  if (!axis) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a parallelAxis at ${index}`)
  }
  return axis
}

// EChartsOption['series'] is a `type`-discriminated union, so filtering on the
// literal `type` narrows the elements to ParallelSeriesOption with no cast.
function parallelSeriesArray(option: EChartsOption): readonly ParallelSeriesOption[] {
  const all = option.series
  if (!Array.isArray(all)) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a series array, got ${typeof all}`)
  }
  return all.flatMap(s => s.type === 'parallel' ? [s] : [])
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
        )

        expect(option.parallel).toBeDefined()

        const axes = option.parallelAxis
        expect(axes).toBeDefined()
        expect(axes).toHaveLength(3)
        expect(parallelAxisAt(option, 0).name).toBe('price')
        expect(parallelAxisAt(option, 0).type).toBe('value')
        expect(parallelAxisAt(option, 1).name).toBe('rating')
        expect(parallelAxisAt(option, 2).name).toBe('volume')

        expect(Array.isArray(option.series)).toBe(true)
        expect(option.series).toHaveLength(1) // Default series
        expect(parallelSeriesArray(option)[0]?.data).toHaveLength(2)
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
        )
        const axes = option.parallelAxis
        expect(axes).toBeDefined()

        const nameAxis = parallelAxisAt(option, 0)
        expect(nameAxis.name).toBe('name')
        expect(nameAxis.type).toBe('category')
        // Only the 'category' member of the ParallelAxisOption union has `.data`.
        if (nameAxis.type !== 'category') {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
          throw new Error(`expected a category parallelAxis, got ${String(nameAxis.type)}`)
        }
        expect(nameAxis.data).toEqual(expect.arrayContaining(['A',
          'B']))

        expect(parallelAxisAt(option, 1).name).toBe('value')
        expect(parallelAxisAt(option, 1).type).toBe('value')
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
        )

        expect(option.series).toHaveLength(2)
        const series = parallelSeriesArray(option)
        const s1 = series.find(s => s.name === 'G1')
        const s2 = series.find(s => s.name === 'G2')

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
        )
        expect(option.parallel).toBeDefined()

        const axes = option.parallelAxis
        expect(axes).toBeDefined()
        expect(axes).toHaveLength(1)
        expect(parallelAxisAt(option, 0).name).toBe('price')
        // Defaults to category if no data to infer value
        expect(parallelAxisAt(option, 0).type).toBe('category')
      },
    )

    it(
      'should use dimensionLabels to resolve friendly axis names, keeping data extraction on the raw dim',
      () => {
        // Regression (fs4.11): parallel-chart's dimensions field is raw
        // property paths typed by the user (e.g. 'note.Strength'), and the
        // axis name was always that raw path — never resolved to a
        // displayName the way the property-picker-based charts are.
        const data = [
          { note: { Strength: 51, Agility: 35 } },
          { note: { Strength: 23, Agility: 56 } },
        ]
        const dimensions = 'note.Strength, note.Agility'
        const options = {
          dimensionLabels: {
            'note.Strength': 'Strength',
            'note.Agility': 'Agility',
          },
        }

        const option = createParallelChartOption(
          data,
          dimensions,
          options,
        )

        const axes = option.parallelAxis
        expect(axes).toBeDefined()
        expect(parallelAxisAt(option, 0).name).toBe('Strength')
        expect(parallelAxisAt(option, 1).name).toBe('Agility')

        // Data is still keyed by the raw property path, not the label.
        expect(parallelSeriesArray(option)[0]?.data?.[0]).toEqual([51, 35])
      },
    )

    it(
      'should fall back to the raw dim when no dimensionLabels entry exists',
      () => {
        const data = [{ price: 100 }]
        const option = createParallelChartOption(
          data,
          'price',
        )

        expect(parallelAxisAt(option, 0).name).toBe('price')
      },
    )

    it(
      'should return title message if no dimensions provided',
      () => {
        const option = createParallelChartOption(
          [],
          '',
        )
        const title = Array.isArray(option.title) ? option.title[0] : option.title
        expect(title).toBeDefined()
        expect(title?.text).toContain('No dimensions')
      },
    )
  },
)
