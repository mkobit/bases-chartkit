import { describe, it, expect } from 'bun:test'
import type { GraphTransformerOptions } from '../src/charts/transformer'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { EChartsOption, GraphSeriesOption } from 'echarts'

interface GraphNode {
  readonly name: string
  readonly category?: string
}

function isGraphNode(value: unknown): value is GraphNode {
  return typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string'
}

// EChartsOption['series'] is a `type`-discriminated union, so checking the
// literal `type` narrows `series` to GraphSeriesOption -- no cast needed.
function firstGraphSeries(option: EChartsOption): GraphSeriesOption {
  const series = Array.isArray(option.series) ? option.series[0] : option.series
  if (series?.type !== 'graph') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a graph series, got ${String(series?.type)}`)
  }
  return series
}

// GraphSeriesOption['data'] is a loose library union; this runtime guard
// narrows each node to our { name, category } shape rather than asserting it.
function graphNodes(option: EChartsOption): readonly GraphNode[] {
  const data = firstGraphSeries(option).data
  return Array.isArray(data) ? data.flatMap(node => isGraphNode(node) ? [node] : []) : []
}

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
        const series = firstGraphSeries(result)
        expect(series.type).toBe('graph')
        expect(series.layout).toBe('force')

        // Nodes should include A, B, C, D
        const nodeNames = graphNodes(result).map(n => n.name).sort()
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
        const series = firstGraphSeries(result)

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

        const nodes = graphNodes(result)
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
        const series = firstGraphSeries(result)

        expect(series.links).toHaveLength(1)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.links[0]).toEqual({ source: 'A',
          target: 'B',
          value: undefined })
      },
    )
  },
)
