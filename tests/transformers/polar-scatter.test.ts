import { describe, it, expect } from 'bun:test'
import { createPolarScatterChartOption } from '../../src/charts/transformers/polar-scatter'
import type { BasesData } from '../../src/charts/transformers/base'
import { formatCompactVisualMapLabel } from '../../src/charts/transformers/visual-map'
import type { ContinuousVisualMapComponentOption, EChartsOption, ScatterSeriesOption } from 'echarts'

// EChartsOption['series'] is a `type`-discriminated union, so this needs no
// cast -- checking the literal `type` narrows the element to ScatterSeriesOption.
function scatterSeriesAt(option: EChartsOption, index: number): ScatterSeriesOption {
  const series = Array.isArray(option.series) ? option.series[index] : option.series
  if (series?.type !== 'scatter') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a scatter series, got ${String(series?.type)}`)
  }
  return series
}

// EChartsOption['angleAxis']/['radiusAxis'] are `type`-discriminated unions
// (only the 'category' member has `.data`) -- polar-scatter.ts always sets
// angleAxis to 'category' and radiusAxis to 'value', so these check the real
// discriminant rather than asserting it.
function firstCategoryAngleAxis(option: EChartsOption) {
  const angleAxis = Array.isArray(option.angleAxis) ? option.angleAxis[0] : option.angleAxis
  if (angleAxis?.type !== 'category') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a category angleAxis, got ${String(angleAxis?.type)}`)
  }
  return angleAxis
}

function firstValueRadiusAxis(option: EChartsOption) {
  const radiusAxis = Array.isArray(option.radiusAxis) ? option.radiusAxis[0] : option.radiusAxis
  if (radiusAxis?.type !== 'value') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a value radiusAxis, got ${String(radiusAxis?.type)}`)
  }
  return radiusAxis
}

// polar-scatter.ts always sets visualMap.type explicitly (defaulting to
// 'continuous' when options.visualMapType is omitted, as in the test below),
// so this checks the real discriminant rather than asserting it.
function firstContinuousVisualMap(option: EChartsOption): ContinuousVisualMapComponentOption {
  const visualMap = Array.isArray(option.visualMap) ? option.visualMap[0] : option.visualMap
  if (visualMap?.type !== 'continuous') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a continuous visualMap, got ${String(visualMap?.type)}`)
  }
  return visualMap
}

describe(
  'createPolarScatterChartOption',
  () => {
    const data: BasesData = [
      { angle: 'A',
        radius: 10,
        group: 'G1',
        size: 20 },
      { angle: 'B',
        radius: 20,
        group: 'G1',
        size: 15 },
      { angle: 'C',
        radius: 30,
        group: 'G2',
        size: 25 },
    ]

    it(
      'should create a basic polar scatter chart',
      () => {
        const option = createPolarScatterChartOption(
          data,
          'angle',
          'radius',
        )

        expect(option.polar).toBeDefined()
        expect(option.angleAxis).toBeDefined()
        expect(option.radiusAxis).toBeDefined()

        const angleAxis = firstCategoryAngleAxis(option)
        const radiusAxis = firstValueRadiusAxis(option)
        expect(angleAxis.type).toBe('category')
        expect(radiusAxis.type).toBe('value')
        expect(option.series).toBeDefined()
        expect(option.series).toHaveLength(1)

        const series = scatterSeriesAt(option, 0)
        expect(series.type).toBe('scatter')
        expect(series.coordinateSystem).toBe('polar')
        expect(series.encode).toEqual({
          angle: 'x',
          radius: 'y',
          tooltip: ['x',
            'y',
            's'],
        })
      },
    )

    it(
      'should handle series grouping',
      () => {
        const option = createPolarScatterChartOption(
          data,
          'angle',
          'radius',
          {
            seriesProp: 'group',
          },
        )

        expect(option.series).toHaveLength(2) // G1, G2

        const s1 = scatterSeriesAt(option, 0)
        const s2 = scatterSeriesAt(option, 1)

        expect(s1.name).toBe('G1')
        expect(s2.name).toBe('G2')
      },
    )

    it(
      'should handle size property and visual map',
      () => {
        const option = createPolarScatterChartOption(
          data,
          'angle',
          'radius',
          {
            sizeProp: 'size',
          },
        )

        expect(option.visualMap).toBeDefined()

        const series = scatterSeriesAt(option, 0)
        expect(series.encode?.tooltip).toContain('size')

        const visualMap = firstContinuousVisualMap(option)
        expect(visualMap.formatter).toBe(formatCompactVisualMapLabel)
      },
    )

    it(
      'should hide overlapping angle-axis labels (large numeric categories)',
      () => {
        const option = createPolarScatterChartOption(
          data,
          'angle',
          'radius',
        )

        const angleAxis = firstCategoryAngleAxis(option)
        expect(angleAxis.axisLabel?.hideOverlap).toBe(true)
      },
    )
  },
)
