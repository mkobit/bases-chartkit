import { describe, it, expect } from 'bun:test'
import { createRadarChartOption } from '../../../src/charts/transformers/radar'
import type { RadarSeriesOption } from 'echarts'

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

            const radar = option.radar as { indicator?: { name: string }[] }
            expect(radar.indicator).toEqual([
              { name: 'Strength' },
              { name: 'Intelligence' },
              { name: 'Agility' },
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

            const series = option.series as RadarSeriesOption[]
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

            const radar = option.radar as { indicator?: { name: string }[] }
            expect(radar.indicator).toEqual([
              { name: 'STR' },
              { name: 'INT' },
              { name: 'AGI' },
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

            const series = option.series as RadarSeriesOption[]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = series[0]?.data as any
            expect(data[0].value).toEqual([10, 0, 0])
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

            const radar = option.radar as { indicator?: { name: string }[] }
            expect(radar.indicator).toEqual([
              { name: 'Math' },
              { name: 'Science' },
            ])

            const series = option.series as RadarSeriesOption[]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const seriesData = series[0]?.data as any
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

            const legend = option.legend as { data?: string[] }
            expect(legend.data).toEqual(['A', 'B'])
          },
        )
      },
    )
  },
)
