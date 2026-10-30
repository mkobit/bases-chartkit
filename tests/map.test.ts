import { describe, it, expect } from 'bun:test'
import { createMapChartOption, formatMapTooltip } from '../src/charts/transformers/map'
import type { MapTransformerOptions } from '../src/charts/transformers/map'
import type { BasesData } from '../src/charts/transformers/base'
import { formatCompactVisualMapLabel } from '../src/charts/transformers/visual-map'
import { CHICAGO_LANDMARKS, CHICAGO_SEASONS, mapChartArbitrary } from '../scripts/generators/map'
import { getDeterministicSample } from '../scripts/generators/utils'
import type {
  ContinuousVisualMapComponentOption,
  EChartsOption,
  MapSeriesOption,
} from 'echarts'

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
          value: 0 })
      },
    )

    it(
      'should fallback to 0..100 visualMap range when dataset is empty',
      () => {
        const result = createMapChartOption(
          [],
          mapName,
          { mapName, regionProp: 'Country', valueProp: 'Population' },
        )

        const visualMap = firstContinuousVisualMap(result)
        expect(visualMap.min).toBe(0)
        expect(visualMap.max).toBe(100)
      },
    )

    it(
      'should support piecewise visualMap with splitNumber, pieces, and vertical orientation',
      () => {
        const pieces = [
          { min: 0, max: 50, label: 'Low', color: '#e0f3db' },
          { min: 50, max: 150, label: 'Medium', color: '#a8ddb5' },
          { min: 150, max: 400, label: 'High', color: '#0868ac' },
        ]
        const options: MapTransformerOptions = {
          mapName,
          regionProp: 'Country',
          valueProp: 'Population',
          visualMapType: 'piecewise',
          visualMapOrient: 'vertical',
          visualMapSplitNumber: 3,
          visualMapPieces: pieces,
          visualMapColor: ['#e0f3db', '#a8ddb5', '#0868ac'],
        }

        const result = createMapChartOption(data, mapName, options)

        expect(result.visualMap).toBeDefined()
        expect(result.visualMap).toMatchObject({
          type: 'piecewise',
          orient: 'vertical',
          left: 'left',
          top: 'center',
          splitNumber: 3,
          pieces,
          inRange: {
            color: ['#e0f3db', '#a8ddb5', '#0868ac'],
          },
        })
        expect(result.visualMap).not.toHaveProperty('bottom', '5%')
      },
    )

    it(
      'should respect explicit visualMapLeft and visualMapTop positioning',
      () => {
        const result = createMapChartOption(
          data,
          mapName,
          {
            mapName,
            regionProp: 'Country',
            valueProp: 'Population',
            visualMapLeft: 'right',
            visualMapTop: 'top',
          },
        )

        const visualMap = firstContinuousVisualMap(result)
        expect(visualMap.left).toBe('right')
        expect(visualMap.top).toBe('top')
        expect(visualMap.bottom).toBeUndefined()
      },
    )

    it(
      'should support title, description, xAxisLabel fallback, theme, and legend options',
      () => {
        const withTitle = createMapChartOption(
          data,
          mapName,
          {
            mapName,
            regionProp: 'Country',
            valueProp: 'Population',
            title: 'North America Population',
            description: 'Population in millions',
            theme: 'Vintage',
            legend: true,
            legendPosition: 'bottom',
          },
        )

        expect(withTitle.title).toMatchObject({
          text: 'North America Population',
          subtext: 'Population in millions',
        })
        expect(withTitle).toHaveProperty('theme', 'Vintage')
        expect(withTitle.legend).toMatchObject({
          bottom: 0,
          left: 'center',
          orient: 'horizontal',
        })

        const withXAxisFallback = createMapChartOption(
          data,
          mapName,
          {
            mapName,
            regionProp: 'Country',
            valueProp: 'Population',
            xAxisLabel: 'Fallback Map Title',
          },
        )

        expect(withXAxisFallback.title).toMatchObject({
          text: 'Fallback Map Title',
        })
      },
    )

    it(
      'should support roam and showLabel options on the map series',
      () => {
        const result = createMapChartOption(
          data,
          mapName,
          {
            mapName,
            regionProp: 'Country',
            valueProp: 'Population',
            roam: 'scale',
            showLabel: true,
          },
        )

        const series = mapSeriesList(result)
        expect(series[0]?.roam).toBe('scale')
        expect(series[0]?.label?.show).toBe(true)
      },
    )

    it(
      'should format tooltip values when valueFormat is provided',
      () => {
        const result = createMapChartOption(
          data,
          mapName,
          {
            mapName,
            regionProp: 'Country',
            valueProp: 'Population',
            valueFormat: '{value}M',
          },
        )

        expect(result.tooltip).toBeDefined()
        expect(result.tooltip).toHaveProperty('formatter')

        expect(formatMapTooltip({ name: 'Grant Park', value: 741555 }, 'compact')).toBe('Grant Park : 741.6K')
        expect(formatMapTooltip({ name: 'Wrigley Field', value: { value: 134 } }, 'currency:USD')).toBe('Wrigley Field : $134.00')
        expect(formatMapTooltip({ name: 'Chicago', value: undefined }, 'compact')).toBe('Chicago')
      },
    )

    it(
      'should generate enriched landmark demo data with variance across all 5 GeoJSON landmarks',
      () => {
        const sample = getDeterministicSample(mapChartArbitrary, 20_260_722)

        expect(sample.type).toBe('map')
        expect(sample.data).toHaveLength(CHICAGO_LANDMARKS.length)

        const names = sample.data.map(row => row.landmark)
        expect(names).toEqual([
          'Millennium Park',
          'Navy Pier',
          'Wrigley Field',
          'Grant Park',
          'Lincoln Park',
        ])

        for (const row of sample.data) {
          expect(row.eventCount).toBeGreaterThanOrEqual(15)
          expect(row.eventCount).toBeLessThanOrEqual(150)
          expect(row.attendance).toBeGreaterThanOrEqual(95_000)
          expect(row.rating).toBeGreaterThanOrEqual(4.0)
          expect(row.rating).toBeLessThanOrEqual(5.0)
          expect(row.ticketPrice).toBeGreaterThanOrEqual(10)
          expect(CHICAGO_SEASONS).toContain(row.season)
          expect(row.category.length).toBeGreaterThan(0)
        }

        const attendances = sample.data.map(row => row.attendance)
        expect(Math.max(...attendances) - Math.min(...attendances)).toBeGreaterThan(200_000)
      },
    )
  },
)
