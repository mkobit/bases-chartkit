import { describe, it, expect } from 'bun:test'
import { createPolarLineChartOption } from '../../src/charts/transformers/polar-line'
import type { EChartsOption, LineSeriesOption } from 'echarts'

// EChartsOption['series'] is a `type`-discriminated union, so filtering on the
// literal `type` narrows each element to LineSeriesOption with no cast.
function lineSeriesList(option: EChartsOption): readonly LineSeriesOption[] {
  const rawSeries = Array.isArray(option.series)
    ? option.series
    : option.series === undefined ? [] : [option.series]
  return rawSeries.flatMap(series => series.type === 'line' ? [series] : [])
}

// EChartsOption['angleAxis'] is a `type`-discriminated union (only the
// 'category' member has `.data`) -- polar-line.ts always sets it to
// 'category', so this checks the real discriminant rather than asserting it.
function firstCategoryAngleAxis(option: EChartsOption) {
  const angleAxis = Array.isArray(option.angleAxis) ? option.angleAxis[0] : option.angleAxis
  if (angleAxis?.type !== 'category') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a category angleAxis, got ${String(angleAxis?.type)}`)
  }
  return angleAxis
}

// `.name` is common to every radiusAxis union member, so no discriminant check
// is needed -- this just resolves the single-vs-array shape without a cast.
function firstRadiusAxis(option: EChartsOption) {
  const radiusAxis = Array.isArray(option.radiusAxis) ? option.radiusAxis[0] : option.radiusAxis
  if (radiusAxis === undefined) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error('expected a radiusAxis to be defined')
  }
  return radiusAxis
}

function firstTitle(option: EChartsOption) {
  const title = Array.isArray(option.title) ? option.title[0] : option.title
  if (title === undefined) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error('expected a title to be defined')
  }
  return title
}

describe(
  'createPolarLineChartOption',
  () => {
    const data = [
      { angle: 'North',
        value: 10,
        category: 'A' },
      { angle: 'East',
        value: 20,
        category: 'A' },
      { angle: 'South',
        value: 15,
        category: 'A' },
      { angle: 'West',
        value: 25,
        category: 'A' },
      { angle: 'North',
        value: 5,
        category: 'B' },
      { angle: 'East',
        value: 15,
        category: 'B' },
      { angle: 'South',
        value: 10,
        category: 'B' },
      { angle: 'West',
        value: 20,
        category: 'B' },
    ]

    it(
      'should create a basic polar line chart',
      () => {
        const option = createPolarLineChartOption(
          data,
          'angle',
          'value',
        )

        expect(option.polar).toBeDefined()
        expect(option.angleAxis).toBeDefined()
        expect(option.radiusAxis).toBeDefined()

        const angleAxis = firstCategoryAngleAxis(option)
        expect(angleAxis.type).toBe('category')
        expect(angleAxis.data).toEqual(['North',
          'East',
          'South',
          'West'])

        const series = lineSeriesList(option)
        expect(series).toHaveLength(1)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].type).toBe('line')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].coordinateSystem).toBe('polar')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].name).toBe('value')
      },
    )

    it(
      'should handle series grouping',
      () => {
        const option = createPolarLineChartOption(
          data,
          'angle',
          'value',
          { seriesProp: 'category' },
        )

        const series = lineSeriesList(option)
        expect(series).toHaveLength(2)

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].name).toBe('A')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[1].name).toBe('B')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].coordinateSystem).toBe('polar')
      },
    )

    it(
      'should handle smooth and areaStyle options',
      () => {
        const option = createPolarLineChartOption(
          data,
          'angle',
          'value',
          {
            smooth: true,
            areaStyle: true,
          },
        )

        const series = lineSeriesList(option)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].smooth).toBe(true)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].areaStyle).toBeDefined()
      },
    )

    it(
      'should handle stack option',
      () => {
        const option = createPolarLineChartOption(
          data,
          'angle',
          'value',
          {
            seriesProp: 'category',
            stack: true,
          },
        )

        const series = lineSeriesList(option)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].stack).toBe('total')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[1].stack).toBe('total')
      },
    )

    it(
      'should not set a title by default',
      () => {
        const option = createPolarLineChartOption(
          data,
          'angle',
          'value',
        )

        expect(option.title).toBeUndefined()
      },
    )

    it(
      'should render a title and subtext when provided',
      () => {
        const option = createPolarLineChartOption(
          data,
          'angle',
          'value',
          {
            title: 'Compass readings',
            description: 'Angle is direction; radius is value.',
          },
        )

        const title = firstTitle(option)
        expect(title.text).toBe('Compass readings')
        expect(title.subtext).toBe('Angle is direction; radius is value.')
      },
    )

    it(
      'should name the angle and radius axes from the x/y labels',
      () => {
        const option = createPolarLineChartOption(
          data,
          'angle',
          'value',
          {
            xAxisLabel: 'Direction',
            yAxisLabel: 'Reading',
          },
        )

        const angleAxis = firstCategoryAngleAxis(option)
        const radiusAxis = firstRadiusAxis(option)
        expect(angleAxis.name).toBe('Direction')
        expect(radiusAxis.name).toBe('Reading')
      },
    )

    it(
      'should default the angle and radius axis names to the raw prop keys',
      () => {
        const option = createPolarLineChartOption(
          data,
          'angle',
          'value',
        )

        const angleAxis = firstCategoryAngleAxis(option)
        const radiusAxis = firstRadiusAxis(option)
        expect(angleAxis.name).toBe('angle')
        expect(radiusAxis.name).toBe('value')
      },
    )
  },
)
