import { describe, it, expect } from 'bun:test'
import type { GraphTransformerOptions } from '../src/charts/transformer'
import { transformDataToChartOption } from '../src/charts/transformer'
import { formatGraphTooltip } from '../src/charts/transformers/graph'
import { getCategoricalColor } from '../src/charts/transformers/palette'
import type { EChartsOption, GraphSeriesOption } from 'echarts'

interface GraphNode {
  readonly name: string
  readonly category?: string
  readonly symbolSize?: number
  readonly draggable?: boolean
  readonly itemStyle?: {
    readonly color?: string
  }
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

function optionTheme(option: EChartsOption): unknown {
  return typeof option === 'object' && option !== null && 'theme' in option
    ? option.theme
    : undefined
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
      'should scale node symbolSize based on incident link weights',
      () => {
        // Incident weights: A = 15, B = 18 (max), C = 7 (min), D = 10
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

        const result = transformDataToChartOption(
          data,
          'source',
          'target',
          'graph',
          { valueProp: 'value' },
        )

        const nodes = graphNodes(result)
        const nodeB = nodes.find(n => n.name === 'B')
        const nodeC = nodes.find(n => n.name === 'C')
        const nodeA = nodes.find(n => n.name === 'A')

        expect(nodeB?.symbolSize).toBe(32)
        expect(nodeC?.symbolSize).toBe(16)
        expect(nodeA?.symbolSize).toBeGreaterThan(16)
        expect(nodeA?.symbolSize).toBeLessThan(32)
      },
    )

    it(
      'should use default symbolSize of 20 when links have no weights or equal weights',
      () => {
        const unweightedData = [
          { source: 'A',
            target: 'B' },
          { source: 'B',
            target: 'C' },
        ]

        const unweightedResult = transformDataToChartOption(
          unweightedData,
          'source',
          'target',
          'graph',
        )
        const unweightedNodes = graphNodes(unweightedResult)
        expect(unweightedNodes.map(n => n.symbolSize)).toEqual([20, 20, 20])

        const equalWeightData = [
          { source: 'A',
            target: 'B',
            value: 10 },
        ]

        const equalWeightResult = transformDataToChartOption(
          equalWeightData,
          'source',
          'target',
          'graph',
          { valueProp: 'value' },
        )
        const equalWeightNodes = graphNodes(equalWeightResult)
        expect(equalWeightNodes.map(n => n.symbolSize)).toEqual([20, 20])
      },
    )

    it(
      'should handle categories and assign fallback colors only to uncategorized nodes',
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
        expect(series.categories).toEqual([
          { name: 'Cat1' },
          { name: 'Cat2' },
        ])

        const nodes = graphNodes(result)
        const nodeA = nodes.find(n => n.name === 'A')
        const nodeB = nodes.find(n => n.name === 'B')
        const nodeC = nodes.find(n => n.name === 'C')

        expect(nodeA?.category).toBe('Cat1')
        expect(nodeA?.itemStyle).toBeUndefined()
        expect(nodeB?.category).toBe('Cat2')
        expect(nodeB?.itemStyle).toBeUndefined()
        // Uncategorized node C gets a deterministic fallback color
        expect(nodeC?.category).toBeUndefined()
        expect(nodeC?.itemStyle?.color).toBe(getCategoricalColor('C'))

        expect(result.legend).toBeDefined()
      },
    )

    it(
      'should assign deterministic categorical colors to all nodes when no categories exist',
      () => {
        const data = [
          { source: 'Edge Router',
            target: 'API Gateway' },
          { source: 'API Gateway',
            target: 'Primary Postgres' },
        ]

        const result = transformDataToChartOption(
          data,
          'source',
          'target',
          'graph',
          { legend: true },
        )

        const nodes = graphNodes(result)
        expect(nodes).toHaveLength(3)
        nodes.forEach((node) => {
          expect(node.itemStyle?.color).toBe(getCategoricalColor(node.name))
        })
        // Legend should not be rendered when there are no categories
        expect(result.legend).toBeUndefined()
      },
    )

    it(
      'should apply legendPosition and legendOrient when categories and legend are enabled',
      () => {
        const data = [
          { source: 'A',
            target: 'B',
            zone: 'Edge' },
          { source: 'B',
            target: 'C',
            zone: 'Core' },
        ]

        const result = transformDataToChartOption(
          data,
          'source',
          'target',
          'graph',
          {
            categoryProp: 'zone',
            legend: true,
            legendPosition: 'right',
            legendOrient: 'vertical',
          },
        )

        const legend = Array.isArray(result.legend) ? result.legend[0] : result.legend
        expect(legend).toBeDefined()
        expect(legend?.orient).toBe('vertical')
        expect(legend?.right).toBe(0)
        expect(legend?.top).toBe('middle')
      },
    )

    it(
      'should include theme in returned option when provided',
      () => {
        const data = [
          { source: 'A',
            target: 'B' },
        ]

        const result = transformDataToChartOption(
          data,
          'source',
          'target',
          'graph',
          { theme: 'Vintage' },
        )

        expect(optionTheme(result)).toBe('Vintage')
      },
    )

    it(
      'should preserve default tooltip when valueFormat is undefined and format tooltip when valueFormat is defined',
      () => {
        const data = [
          { source: 'Edge Router',
            target: 'WAF Gateway',
            traffic: 450 },
        ]

        const defaultResult = transformDataToChartOption(
          data,
          'source',
          'target',
          'graph',
          { valueProp: 'traffic' },
        )
        const defaultTooltip = Array.isArray(defaultResult.tooltip) ? defaultResult.tooltip[0] : defaultResult.tooltip
        expect(defaultTooltip?.formatter).toBeUndefined()

        const formattedResult = transformDataToChartOption(
          data,
          'source',
          'target',
          'graph',
          {
            valueProp: 'traffic',
            valueFormat: '{value} Gbps',
          },
        )
        const formattedTooltip = Array.isArray(formattedResult.tooltip) ? formattedResult.tooltip[0] : formattedResult.tooltip
        expect(typeof formattedTooltip?.formatter).toBe('function')

        expect(formatGraphTooltip({ name: 'Edge Router > WAF Gateway', value: 450 }, '{value} Gbps')).toBe(
          'Edge Router > WAF Gateway : 450 Gbps',
        )
        expect(formatGraphTooltip({ name: 'Edge Router', value: { value: 320 } }, '{value} Gbps')).toBe(
          'Edge Router : 320 Gbps',
        )
        expect(formatGraphTooltip({ name: 'Edge Router' }, '{value} Gbps')).toBe(
          'Edge Router',
        )
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
