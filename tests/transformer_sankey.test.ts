import { describe, it, expect } from 'bun:test'
import type { SankeyTransformerOptions } from '../src/charts/transformer'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { SankeySeriesOption } from 'echarts'

describe(
  'Sankey Transformer',
  () => {
    it(
      'should transform data to sankey series',
      () => {
        const data = [
          { source: 'A',
            target: 'B',
            value: 10 },
          { source: 'A',
            target: 'C',
            value: 5 },
          { source: 'B',
            target: 'D',
            value: 8 },
          { source: 'C',
            target: 'D',
            value: 2 },
        ]

        const options: SankeyTransformerOptions = {
          valueProp: 'value',
        }

        const result = transformDataToChartOption(
          data,
          'source',
          'target',
          'sankey',
          options,
        )

        expect(result.series).toHaveLength(1)
        const series = (result.series as readonly SankeySeriesOption[])[0]!
        expect(series.type).toBe('sankey')

        // Nodes should include A, B, C, D
        const nodeNames = (series.data as readonly { readonly name: string }[]).map(n => n.name).sort()
        expect(nodeNames).toEqual(['A',
          'B',
          'C',
          'D'])

        // Links
        expect(series.links).toHaveLength(4)
        expect(series.links).toEqual(expect.arrayContaining([
          { source: 'A',
            target: 'B',
            value: 10 },
          { source: 'A',
            target: 'C',
            value: 5 },
          { source: 'B',
            target: 'D',
            value: 8 },
          { source: 'C',
            target: 'D',
            value: 2 },
        ]))
      },
    )

    it(
      'should handle missing values with default 1',
      () => {
        const data = [
          { source: 'A',
            target: 'B' }, // No value
          { source: 'A',
            target: 'C',
            value: 5 },
        ]

        const options: SankeyTransformerOptions = {
          valueProp: 'value',
        }

        const result = transformDataToChartOption(
          data,
          'source',
          'target',
          'sankey',
          options,
        )
        const series = (result.series as readonly SankeySeriesOption[])[0]!

        expect(series.links).toEqual(expect.arrayContaining([
          { source: 'A',
            target: 'B',
            value: 1 }, // Default
          { source: 'A',
            target: 'C',
            value: 5 },
        ]))
      },
    )

    it(
      'should skip invalid items',
      () => {
        const data = [
          { source: 'A',
            target: 'B' },
          { source: 'A' }, // Missing target
          { target: 'C' }, // Missing source
        ]

        const result = transformDataToChartOption(
          data,
          'source',
          'target',
          'sankey',
        )
        const series = (result.series as readonly SankeySeriesOption[])[0]!

        expect(series.links).toHaveLength(1)
        expect(series.links![0]).toEqual({ source: 'A',
          target: 'B',
          value: 1 })
      },
    )
  },
)
