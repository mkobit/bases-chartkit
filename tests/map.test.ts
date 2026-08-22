import { describe, it, expect } from 'bun:test'
import { createMapChartOption } from '../src/charts/transformers/map'
import type { MapTransformerOptions } from '../src/charts/transformers/map'
import type { BasesData } from '../src/charts/transformers/base'
import { formatCompactVisualMapLabel } from '../src/charts/transformers/utils'
import type { ContinuousVisualMapComponentOption, EChartsOption, MapSeriesOption } from 'echarts'

// EChartsOption['series'] is a `type`-discriminated union, so checking the
// literal `type` narrows each entry to MapSeriesOption -- no cast needed.
function mapSeriesList(option: EChartsOption): readonly MapSeriesOption[] {
  const series = option.series
  const list = Array.isArray(series) ? series : series ? [series] : []
  return list.flatMap(s => s.type === 'map' ? [s] : [])
}

// map.ts always sets visualMap.type explicitly (defaulting to 'continuous'
// when options.visualMapType is omitted, as in every test below), so this
// checks the real discriminant rather than asserting it.
function firstContinuousVisualMap(option: EChartsOption): ContinuousVisualMapComponentOption {
  const visualMap = Array.isArray(option.visualMap) ? option.visualMap[0] : option.visualMap
  if (visualMap?.type !== 'continuous') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a continuous visualMap, got ${String(visualMap?.type)}`)
  }
  return visualMap
}

describe(
  'Map Chart Transformer',
  () => {
    const data: BasesData = [
      { Country: 'USA',
        Population: 330,
        Unrelated: 'foo' },
      { Country: 'Canada',
        Population: 38 },
      { Country: 'Mexico',
        Population: 126 },
      { Country: '',
        Population: 0 }, // Should be filtered out
    ]

    const mapName = 'world'

    it(
      'should create basic map chart options',
      () => {
        const options: MapTransformerOptions = {
          mapName: mapName,
          regionProp: 'Country',
          valueProp: 'Population',
        }

        const result = createMapChartOption(
          data,
          mapName,
          options,
        )

        expect(result.series).toBeDefined()

        const series = mapSeriesList(result)
        expect(series).toHaveLength(1)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].type).toBe('map')
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].map).toBe(mapName)

        // @ts-expect-error - suppress strictNullChecks in tests
        const mapData = series[0].data
        expect(mapData).toHaveLength(3)
        expect(mapData).toContainEqual({ name: 'USA',
          value: 330 })
        expect(mapData).toContainEqual({ name: 'Canada',
          value: 38 })
        expect(mapData).toContainEqual({ name: 'Mexico',
          value: 126 })
      },
    )

    it(
      'should handle visual map configuration',
      () => {
        const options: MapTransformerOptions = {
          mapName: mapName,
          regionProp: 'Country',
          valueProp: 'Population',
          visualMapMin: 0,
          visualMapMax: 500,
          visualMapColor: ['#ff0000',
            '#0000ff'],
        }

        const result = createMapChartOption(
          data,
          mapName,
          options,
        )

        expect(result.visualMap).toBeDefined()
        expect(result.visualMap).toMatchObject({
          min: 0,
          max: 500,
          inRange: {
            color: ['#ff0000',
              '#0000ff'],
          },
        })
      },
    )

    it(
      'should auto-calculate min/max if not provided',
      () => {
        const options: MapTransformerOptions = {
          mapName: mapName,
          regionProp: 'Country',
          valueProp: 'Population',
        }

        const result = createMapChartOption(
          data,
          mapName,
          options,
        )

        expect(result.visualMap).toBeDefined()

        const visualMap = firstContinuousVisualMap(result)
        // Min should be min value (38), Max should be max value (330)
        expect(visualMap.min).toBe(38)
        expect(visualMap.max).toBe(330)
      },
    )

    it(
      'should abbreviate visualMap handle labels to avoid overlap on large-value axes',
      () => {
        const options: MapTransformerOptions = {
          mapName: mapName,
          regionProp: 'Country',
          valueProp: 'Population',
        }

        const result = createMapChartOption(
          data,
          mapName,
          options,
        )

        const visualMap = firstContinuousVisualMap(result)
        expect(visualMap.formatter).toBe(formatCompactVisualMapLabel)
      },
    )

    it(
      'should handle missing values gracefully',
      () => {
        const dirtyData: BasesData = [
          { Country: 'A' }, // No value
          { Country: 'B',
            Population: 'invalid' },
        ]

        const result = createMapChartOption(
          dirtyData,
          mapName,
          { mapName,
            regionProp: 'Country',
            valueProp: 'Population' },
        )

        const series = mapSeriesList(result)

        // @ts-expect-error - suppress strictNullChecks in tests
        const mapData = series[0].data

        expect(mapData).toContainEqual({ name: 'A',
          value: 0 })
        expect(mapData).toContainEqual({ name: 'B',
          value: 0 }) // Number('invalid') -> NaN -> 0 logic in transformer? Check transformer logic.
      },
    )
  },
)
