import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { EChartsOption } from 'echarts'

interface WordCloudDatum {
  readonly name: string
  readonly value: number
}

interface WordCloudSeries {
  readonly type: string
  readonly gridSize: number
  readonly sizeRange: readonly number[]
  readonly rotationRange: readonly number[]
  readonly rotationStep: number
  readonly data: readonly WordCloudDatum[]
}

// echarts-wordcloud is an extension series with no public type in the 'echarts'
// module, so narrow the untyped series entries to the shape these tests read
// with a runtime guard and flatMap -- no cast needed.
function isWordCloudSeries(value: unknown): value is WordCloudSeries {
  return typeof value === 'object' && value !== null
    && 'type' in value && value.type === 'wordCloud'
    && 'gridSize' in value && typeof value.gridSize === 'number'
    && 'sizeRange' in value && Array.isArray(value.sizeRange)
    && 'rotationRange' in value && Array.isArray(value.rotationRange)
    && 'rotationStep' in value && typeof value.rotationStep === 'number'
    && 'data' in value && Array.isArray(value.data)
}

function wordCloudSeries(option: EChartsOption): readonly WordCloudSeries[] {
  const series = option.series
  const entries = Array.isArray(series) ? series : series === undefined ? [] : [series]
  return entries.flatMap(entry => isWordCloudSeries(entry) ? [entry] : [])
}

describe(
  'Word Cloud Transformer',
  () => {
    it(
      'should transform data correctly for word cloud',
      () => {
        const data = [
          { word: 'Hello',
            count: 10 },
          { word: 'World',
            count: 20 },
          { word: 'Ignored',
            count: 0 },
        ]

        const option = transformDataToChartOption(
          data,
          'word',
          'count',
          'wordCloud',
          {
            gridSize: 5,
            sizeRangeMin: 10,
            sizeRangeMax: 50,
          },
        )

        expect(option).toBeDefined()
        const series = wordCloudSeries(option)
        expect(series).toBeDefined()
        expect(series.length).toBe(1)
        expect(series[0]?.type).toBe('wordCloud')
        expect(series[0]?.gridSize).toBe(5)
        expect(series[0]?.sizeRange).toEqual([10,
          50])

        const seriesData = series[0]?.data ?? []
        expect(seriesData.length).toBe(2)

        const itemHello = seriesData.find(d => d.name === 'Hello')
        expect(itemHello?.value).toBe(10)
      },
    )

    it(
      'should apply rotation options when provided',
      () => {
        const data = [
          { word: 'Hello',
            count: 10 },
        ]

        const option = transformDataToChartOption(
          data,
          'word',
          'count',
          'wordCloud',
          {
            rotationRangeMin: -45,
            rotationRangeMax: 45,
            rotationStep: 15,
          },
        )

        const series = wordCloudSeries(option)
        expect(series[0]?.rotationRange).toEqual([-45,
          45])
        expect(series[0]?.rotationStep).toBe(15)
      },
    )
  },
)
