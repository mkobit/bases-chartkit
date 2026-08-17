import { describe, it, expect } from 'bun:test'
import { createPolarLineChartOption } from '../../src/charts/transformers/polar-line'
import type { LineSeriesOption } from 'echarts'

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

        // Use explicit cast or optional chain checks
        const angleAxis = option.angleAxis as { type?: string
          data?: unknown[] }
        expect(angleAxis.type).toBe('category')
        expect(angleAxis.data).toEqual(['North',
          'East',
          'South',
          'West'])

        const series = option.series as LineSeriesOption[]
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

        const series = option.series as LineSeriesOption[]
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

        const series = option.series as LineSeriesOption[]
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

        const series = option.series as LineSeriesOption[]
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

        const title = option.title as { text?: string
          subtext?: string }
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

        const angleAxis = option.angleAxis as { name?: string }
        const radiusAxis = option.radiusAxis as { name?: string }
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

        const angleAxis = option.angleAxis as { name?: string }
        const radiusAxis = option.radiusAxis as { name?: string }
        expect(angleAxis.name).toBe('angle')
        expect(radiusAxis.name).toBe('value')
      },
    )
  },
)
