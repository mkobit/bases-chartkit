import { describe, it, expect } from 'bun:test'
import type { GraphTransformerOptions } from '../src/charts/transformer'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { GraphSeriesOption } from 'echarts'

describe(
  'Graph Transformer',
  () => {
    it(
      'should transform data to graph series',
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

        const options: GraphTransformerOptions = {
          valueProp: 'value',
        }

        const result = transformDataToChartOption(
          data,
          'source',
          'target',
          'graph',
          options,
        )

        expect(result.series).toHaveLength(1)
        const series = (result.series as readonly GraphSeriesOption[])[0]!
        expect(series.type).toBe('graph')
        expect(series.layout).toBe('force')

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
      'should handle categories',
      () => {
        const data = [
          { source: 'A',
            target: 'B',
            category: 'Cat1' },
          { source: 'B',
            target: 'C',
            category: 'Cat2' },
          { source: 'C',
            target: 'A' }, // No category
        ]

        const options: GraphTransformerOptions = {
          categoryProp: 'category',
          legend: true,
        }

        const result = transformDataToChartOption(
          data,
          'source',
          'target',
          'graph',
          options,
        )
        const series = (result.series as readonly GraphSeriesOption[])[0]!

        // Check categories list
        expect(series.categories).toEqual(expect.arrayContaining([
          { name: 'Cat1' },
          { name: 'Cat2' },
        ]))

        // Check node categories
        // Node A should be Cat1 (source in row 1)
        // Node B should be Cat2 (source in row 2)
        // Node C ... depends. If it was never a source with category, it remains undefined.
        // Wait, C appears as target in row 2 (cat2 applies to B), and source in row 3 (no cat).

        const nodes = series.data as readonly { readonly name: string
          category?: string }[]
        const nodeA = nodes.find(n => n.name === 'A')
        const nodeB = nodes.find(n => n.name === 'B')

        expect(nodeA?.category).toBe('Cat1')
        expect(nodeB?.category).toBe('Cat2')

        expect(result.legend).toBeDefined()
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
          'graph',
        )
        const series = (result.series as readonly GraphSeriesOption[])[0]!

        expect(series.links).toHaveLength(1)
        expect(series.links![0]).toEqual({ source: 'A',
          target: 'B',
          value: undefined })
      },
    )
  },
)
