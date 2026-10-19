import { describe, it, expect } from 'bun:test'
import { createRadarChartOption } from '../../../src/charts/transformers/radar'
import type { EChartsOption, RadarSeriesOption } from 'echarts'

interface RadarDatum {
  readonly value: readonly number[]
}

function isRadarDatum(value: unknown): value is RadarDatum {
  return typeof value === 'object' && value !== null && 'value' in value && Array.isArray(value.value)
}

// EChartsOption['radar'] is a single component option (not a discriminated
// union), so unwrap the array form and access `.indicator` directly.
function radarComponent(option: EChartsOption) {
  const radar = Array.isArray(option.radar) ? option.radar[0] : option.radar
  if (!radar) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error('expected a radar component')
  }
  return radar
}

// EChartsOption['series'] is a `type`-discriminated union, so checking the
// literal `type` narrows each entry to RadarSeriesOption -- no cast needed.
function radarSeriesList(option: EChartsOption): readonly RadarSeriesOption[] {
  const series = option.series
  const list = Array.isArray(series) ? series : series ? [series] : []
  return list.flatMap(s => s.type === 'radar' ? [s] : [])
}

// RadarSeriesOption['data'] is a generic library union with no discriminant TS
// can check -- filter to the real datum shape via a runtime guard.
function firstSeriesData(option: EChartsOption): readonly RadarDatum[] {
  const data = radarSeriesList(option)[0]?.data
  return Array.isArray(data) ? data.flatMap(row => isRadarDatum(row) ? [row] : []) : []
}

function legendComponent(option: EChartsOption) {
  const legend = Array.isArray(option.legend) ? option.legend[0] : option.legend
  if (!legend) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error('expected a legend component')
  }
  return legend
}

describe(
  'createRadarChartOption',
  () => {
    describe(
      'wide format (metricProps)',
      () => {
        // Reproduces the RPG_Stats.base bug: one row per character with
        // Strength/Intelligence/Agility columns. The chart needs one radar
        // axis per metric and one series (polygon) per character — a shape
        // the long-format (single indicatorProp + seriesProp) implementation
        // can't represent, causing a fully blank chart.
        const characters = [
          { Name: 'Hero 0',
            Strength: 51,
            Intelligence: 40,
            Agility: 35 },
          { Name: 'Hero 1',
            Strength: 23,
            Intelligence: 93,
            Agility: 56 },
        ]

        it(
          'should build one radar indicator per metric prop',
          () => {
            const option = createRadarChartOption(
              characters,
              'Name',
              '',
              { metricProps: ['Strength', 'Intelligence', 'Agility'] },
            )

            const radar = radarComponent(option)
            expect(radar.indicator).toEqual([
              { name: 'Strength', min: 0, max: 51 },
              { name: 'Intelligence', min: 0, max: 93 },
              { name: 'Agility', min: 0, max: 56 },
            ])
          },
        )

        it(
          'should build one series entry per row, named from the name prop',
          () => {
            const option = createRadarChartOption(
              characters,
              'Name',
              '',
              { metricProps: ['Strength', 'Intelligence', 'Agility'] },
            )

            const series = radarSeriesList(option)
            expect(series).toHaveLength(1)
            expect(series[0]?.data).toEqual([
              { value: [51, 40, 35],
                name: 'Hero 0' },
              { value: [23, 93, 56],
                name: 'Hero 1' },
            ])
          },
        )

        it(
          'should use metricLabels to resolve friendly indicator names, keeping value lookups on the raw metric prop',
          () => {
            // Regression (fs4.11): metricProps are raw property paths typed
            // by the user (e.g. 'note.Strength'), and the radar indicator
            // name was always that raw path — never resolved to a
            // displayName.
            const option = createRadarChartOption(
              characters,
              'Name',
              '',
              {
                metricProps: ['Strength', 'Intelligence', 'Agility'],
                metricLabels: {
                  Strength: 'STR',
                  Intelligence: 'INT',
                  Agility: 'AGI',
                },
              },
            )

            const radar = radarComponent(option)
            expect(radar.indicator).toEqual([
              { name: 'STR', min: 0, max: 51 },
              { name: 'INT', min: 0, max: 93 },
              { name: 'AGI', min: 0, max: 56 },
            ])
          },
        )

        it(
          'should default missing/non-numeric metric values to 0',
          () => {
            const option = createRadarChartOption(
              [{ Name: 'Incomplete',
                Strength: 10 }],
              'Name',
              '',
              { metricProps: ['Strength', 'Intelligence', 'Agility'] },
            )

            const data = firstSeriesData(option)
            expect(data[0]?.value).toEqual([10, 0, 0])
          },
        )

        it(
          'should give each indicator its own auto-computed max instead of one shared/unscaled max',
          () => {
            // Regression (bck-3d5): a 0-20-ish metric plotted next to a
            // 0-10000-ish metric on the same polygon, with no per-indicator
            // max, made the small metric look "maxed out" relative to the
            // large one. Each indicator's max must reflect its own data.
            const option = createRadarChartOption(
              [{ Name: 'Row',
                Small: 20,
                Large: 10_000 }],
              'Name',
              '',
              { metricProps: ['Small', 'Large'] },
            )

            const radar = radarComponent(option)
            expect(radar.indicator).toEqual([
              { name: 'Small', min: 0, max: 20 },
              { name: 'Large', min: 0, max: 10_000 },
            ])
          },
        )

        it(
          'should extend min below 0 when a metric has negative values, rather than clipping them',
          () => {
            const option = createRadarChartOption(
              [{ Name: 'Row', Profit: -50 },
                { Name: 'Row2', Profit: 30 }],
              'Name',
              '',
              { metricProps: ['Profit'] },
            )

            const radar = radarComponent(option)
            expect(radar.indicator).toEqual([
              { name: 'Profit', min: -50, max: 30 },
            ])
          },
        )

        it(
          'should give an all-zero metric a non-zero-width range instead of a degenerate 0-0 axis',
          () => {
            const option = createRadarChartOption(
              [{ Name: 'Row', Flat: 0 },
                { Name: 'Row2', Flat: 0 }],
              'Name',
              '',
              { metricProps: ['Flat'] },
            )

            const radar = radarComponent(option)
            expect(radar.indicator).toEqual([
              { name: 'Flat', min: 0, max: 10 },
            ])
          },
        )

        it(
          'should support all 6 fantasy attributes with per-indicator ranges and series data',
          () => {
            const charactersWithSixStats = [
              {
                Name: 'Paladin',
                Strength: 18,
                Dexterity: 10,
                Constitution: 16,
                Intelligence: 12,
                Wisdom: 14,
                Charisma: 17,
              },
              {
                Name: 'Rogue',
                Strength: 8,
                Dexterity: 18,
                Constitution: 12,
                Intelligence: 14,
                Wisdom: 10,
                Charisma: 16,
              },
            ]

            const option = createRadarChartOption(
              charactersWithSixStats,
              'Name',
              '',
              {
                metricProps: [
                  'Strength',
                  'Dexterity',
                  'Constitution',
                  'Intelligence',
                  'Wisdom',
                  'Charisma',
                ],
              },
            )

            const radar = radarComponent(option)
            expect(radar.indicator).toEqual([
              { name: 'Strength', min: 0, max: 18 },
              { name: 'Dexterity', min: 0, max: 18 },
              { name: 'Constitution', min: 0, max: 16 },
              { name: 'Intelligence', min: 0, max: 14 },
              { name: 'Wisdom', min: 0, max: 14 },
              { name: 'Charisma', min: 0, max: 17 },
            ])

            const series = radarSeriesList(option)
            expect(series[0]?.data).toEqual([
              {
                value: [18, 10, 16, 12, 14, 17],
                name: 'Paladin',
              },
              {
                value: [8, 18, 12, 14, 10, 16],
                name: 'Rogue',
              },
            ])
          },
        )

        it(
          'should support filled area styling when areaStyle is boolean',
          () => {
            const option = createRadarChartOption(
              characters,
              'Name',
              '',
              {
                metricProps: ['Strength', 'Intelligence', 'Agility'],
                areaStyle: true,
              },
            )

            const series = radarSeriesList(option)
            expect(series[0]?.areaStyle).toEqual({})
          },
        )

        it(
          'should support filled area styling with custom opacity object',
          () => {
            const option = createRadarChartOption(
              characters,
              'Name',
              '',
              {
                metricProps: ['Strength', 'Intelligence', 'Agility'],
                areaStyle: { opacity: 0.4 },
              },
            )

            const series = radarSeriesList(option)
            expect(series[0]?.areaStyle).toEqual({ opacity: 0.4 })
          },
        )

        it(
          'should support fillArea boolean option with areaOpacity',
          () => {
            const option = createRadarChartOption(
              characters,
              'Name',
              '',
              {
                metricProps: ['Strength', 'Intelligence', 'Agility'],
                fillArea: true,
                areaOpacity: 0.25,
              },
            )

            const series = radarSeriesList(option)
            expect(series[0]?.areaStyle).toEqual({ opacity: 0.25 })
          },
        )

        it(
          'should support circular grid shape option',
          () => {
            const option = createRadarChartOption(
              characters,
              'Name',
              '',
              {
                metricProps: ['Strength', 'Intelligence', 'Agility'],
                shape: 'circle',
              },
            )

            const radar = radarComponent(option)
            expect(radar.shape).toBe('circle')
          },
        )

        it(
          'should support theme option in options',
          () => {
            const option = createRadarChartOption(
              characters,
              'Name',
              '',
              {
                metricProps: ['Strength', 'Intelligence', 'Agility'],
                theme: 'Vintage',
              },
            )

            expect(option.radar).toBeDefined()
            expect(option.series).toBeDefined()
          },
        )
      },
    )

    describe(
      'long format (indicatorProp + seriesProp)',
      () => {
        const data = [
          { subject: 'Math',
            score: 90,
            student: 'A' },
          { subject: 'Science',
            score: 80,
            student: 'A' },
          { subject: 'Math',
            score: 70,
            student: 'B' },
          { subject: 'Science',
            score: 95,
            student: 'B' },
        ]

        it(
          'should group rows into one series per seriesProp value',
          () => {
            const option = createRadarChartOption(
              data,
              'subject',
              'score',
              { seriesProp: 'student' },
            )

            const radar = radarComponent(option)
            expect(radar.indicator).toEqual([
              { name: 'Math', min: 0, max: 90 },
              { name: 'Science', min: 0, max: 95 },
            ])

            const seriesData = radarSeriesList(option)[0]?.data
            expect(seriesData).toEqual([
              { value: [90, 80],
                name: 'A' },
              { value: [70, 95],
                name: 'B' },
            ])
          },
        )

        it(
          'should list actual series names in the legend, not array indices',
          () => {
            // Regression: legend.data was built via R.keys(seriesData) on an
            // array, which yields indices ('0', '1') instead of series names.
            const option = createRadarChartOption(
              data,
              'subject',
              'score',
              { seriesProp: 'student',
                legend: true },
            )

            const legend = legendComponent(option)
            expect(legend.data).toEqual(['A', 'B'])
          },
        )

        it(
          'should support all 6 attributes in long format',
          () => {
            const sixStatData = [
              { attribute: 'Strength', val: 18, character: 'Paladin' },
              { attribute: 'Dexterity', val: 12, character: 'Paladin' },
              { attribute: 'Constitution', val: 16, character: 'Paladin' },
              { attribute: 'Intelligence', val: 10, character: 'Paladin' },
              { attribute: 'Wisdom', val: 14, character: 'Paladin' },
              { attribute: 'Charisma', val: 17, character: 'Paladin' },
            ]

            const option = createRadarChartOption(
              sixStatData,
              'attribute',
              'val',
              { seriesProp: 'character' },
            )

            const radar = radarComponent(option)
            expect(radar.indicator).toHaveLength(6)
            expect(radar.indicator?.map(i => i.name)).toEqual([
              'Strength',
              'Dexterity',
              'Constitution',
              'Intelligence',
              'Wisdom',
              'Charisma',
            ])
          },
        )

        it(
          'should support circular shape and area styling in long format',
          () => {
            const option = createRadarChartOption(
              data,
              'subject',
              'score',
              {
                seriesProp: 'student',
                shape: 'circle',
                areaStyle: { opacity: 0.35 },
              },
            )

            const radar = radarComponent(option)
            expect(radar.shape).toBe('circle')

            const series = radarSeriesList(option)
            expect(series[0]?.areaStyle).toEqual({ opacity: 0.35 })
          },
        )
      },
    )
  },
)
