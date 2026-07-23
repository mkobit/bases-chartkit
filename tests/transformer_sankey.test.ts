import { describe, it, expect } from 'bun:test'
import type { SankeyTransformerOptions } from '../src/charts/transformer'
import { transformDataToChartOption } from '../src/charts/transformer'
import { hasSankeyCycle, sankeyLinkSignature } from '../src/charts/transformers/sankey'
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
        const series = (result.series as readonly SankeySeriesOption[])[0]
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.type).toBe('sankey')

        // Nodes should include A, B, C, D
        // @ts-expect-error - suppress strictNullChecks in tests
        const nodeNames = (series.data as readonly { readonly name: string }[]).map(n => n.name).sort()
        expect(nodeNames).toEqual(['A',
          'B',
          'C',
          'D'])

        // Links
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.links).toHaveLength(4)
        // @ts-expect-error - suppress strictNullChecks in tests
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
        const series = (result.series as readonly SankeySeriesOption[])[0]

        // @ts-expect-error - suppress strictNullChecks in tests
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
        const series = (result.series as readonly SankeySeriesOption[])[0]

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.links).toHaveLength(1)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.links[0]).toEqual({ source: 'A',
          target: 'B',
          value: 1 })
      },
    )

    it(
      'should drop self-referencing links (source === target)',
      () => {
        const data = [
          { source: 'A',
            target: 'A',
            value: 10 },
          { source: 'A',
            target: 'B',
            value: 5 },
        ]

        const result = transformDataToChartOption(
          data,
          'source',
          'target',
          'sankey',
          { valueProp: 'value' },
        )
        const series = (result.series as readonly SankeySeriesOption[])[0]

        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.links).toHaveLength(1)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series.links[0]).toEqual({ source: 'A',
          target: 'B',
          value: 5 })
        // @ts-expect-error - suppress strictNullChecks in tests
        const nodeNames = (series.data as readonly { readonly name: string }[]).map(n => n.name).sort()
        expect(nodeNames).toEqual(['A',
          'B'])
      },
    )
  },
)

describe(
  'hasSankeyCycle',
  () => {
    it(
      'returns false for an acyclic chain',
      () => {
        const data = [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
          { source: 'A', target: 'C' },
        ]

        expect(hasSankeyCycle(
          data,
          'source',
          'target',
        )).toBe(false)
      },
    )

    it(
      'returns true for a direct cycle (A -> B -> A)',
      () => {
        const data = [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'A' },
        ]

        expect(hasSankeyCycle(
          data,
          'source',
          'target',
        )).toBe(true)
      },
    )

    it(
      'returns true for a longer cycle (A -> B -> C -> A)',
      () => {
        const data = [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
          { source: 'C', target: 'A' },
        ]

        expect(hasSankeyCycle(
          data,
          'source',
          'target',
        )).toBe(true)
      },
    )

    it(
      'ignores a self-loop rather than treating it as a cycle',
      () => {
        const data = [
          { source: 'A', target: 'A' },
          { source: 'A', target: 'B' },
        ]

        expect(hasSankeyCycle(
          data,
          'source',
          'target',
        )).toBe(false)
      },
    )

    it(
      'detects a genuine cycle even when a self-loop is present elsewhere in the same data',
      () => {
        const data = [
          { source: 'X', target: 'X' }, // self-loop, filtered out
          { source: 'A', target: 'B' },
          { source: 'B', target: 'A' }, // the real cycle
        ]

        expect(hasSankeyCycle(
          data,
          'source',
          'target',
        )).toBe(true)
      },
    )

    it(
      'detects a cycle in one weakly-connected cluster even when another cluster is acyclic',
      () => {
        const data = [
          { source: 'P', target: 'Q' }, // acyclic cluster
          { source: 'Q', target: 'R' },
          { source: 'A', target: 'B' }, // separate, cyclic cluster
          { source: 'B', target: 'A' },
        ]

        expect(hasSankeyCycle(
          data,
          'source',
          'target',
        )).toBe(true)
      },
    )
  },
)

describe(
  'sankeyLinkSignature',
  () => {
    it(
      'is stable for the same links regardless of row order',
      () => {
        const dataA = [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'A' },
        ]
        const dataB = [
          { source: 'B', target: 'A' },
          { source: 'A', target: 'B' },
        ]

        expect(sankeyLinkSignature(
          dataA,
          'source',
          'target',
        )).toBe(sankeyLinkSignature(
          dataB,
          'source',
          'target',
        ))
      },
    )

    it(
      'differs when the data changes to a different cycle',
      () => {
        const cycleOne = [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'A' },
        ]
        const cycleTwo = [
          { source: 'C', target: 'D' },
          { source: 'D', target: 'C' },
        ]

        expect(sankeyLinkSignature(
          cycleOne,
          'source',
          'target',
        )).not.toBe(sankeyLinkSignature(
          cycleTwo,
          'source',
          'target',
        ))
      },
    )
  },
)
