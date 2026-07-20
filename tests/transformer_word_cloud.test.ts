import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'

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
        const series = option.series as any[]
        expect(series).toBeDefined()
        expect(series.length).toBe(1)
        expect(series[0].type).toBe('wordCloud')
        expect(series[0].gridSize).toBe(5)
        expect(series[0].sizeRange).toEqual([10,
          50])

        const seriesData = series[0].data as any[]
        expect(seriesData.length).toBe(2)

        const itemHello = seriesData.find((d: any) => d.name === 'Hello')
        expect(itemHello.value).toBe(10)
      },
    )
  },
)
