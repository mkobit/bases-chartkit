import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { EChartsOption, SunburstSeriesOption, TreeSeriesOption } from 'echarts'

interface HierarchyNode {
  readonly name: string
  readonly value?: number
  readonly children?: readonly HierarchyNode[]
}

function isHierarchyNode(value: unknown): value is HierarchyNode {
  return typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string'
}

// EChartsOption['series'] is a `type`-discriminated union, so checking the
// literal `type` narrows `series` to the concrete series -- no cast needed.
function firstSunburstSeries(option: EChartsOption): SunburstSeriesOption {
  const series = Array.isArray(option.series) ? option.series[0] : option.series
  if (series?.type !== 'sunburst') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a sunburst series, got ${String(series?.type)}`)
  }
  return series
}

function firstTreeSeries(option: EChartsOption): TreeSeriesOption {
  const series = Array.isArray(option.series) ? option.series[0] : option.series
  if (series?.type !== 'tree') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a tree series, got ${String(series?.type)}`)
  }
  return series
}

// ECharts series.data is a loose OptionDataItem union; this runtime guard
// narrows the roots to our HierarchyNode shape rather than asserting it.
function hierarchyRoots(series: SunburstSeriesOption | TreeSeriesOption): readonly HierarchyNode[] {
  const data = series.data
  return Array.isArray(data) ? data.flatMap((node: unknown) => isHierarchyNode(node) ? [node] : []) : []
}

describe(
  'Transformer - Hierarchical Charts',
  () => {
    describe(
      'Sunburst',
      () => {
        it(
          'should build hierarchy from path property',
          () => {
            const data = [
              { path: 'A/B',
                val: 10 },
              { path: 'A/C',
                val: 5 },
              { path: 'D',
                val: 20 },
            ]

            const option = transformDataToChartOption(
              data,
              'path',
              '',
              'sunburst',
              {
                valueProp: 'val',
              },
            )

            expect(option.series).toBeDefined()

            // Validate and narrow type for option.series
            expect(Array.isArray(option.series)).toBe(true)
            expect(option.series).not.toHaveLength(0)
            if (!Array.isArray(option.series) || option.series.length === 0) {
              return
            }

            const series = firstSunburstSeries(option)
            expect(series.type).toBe('sunburst')

            const hierarchy = hierarchyRoots(series)
            expect(hierarchy).toHaveLength(2) // A and D

            const nodeA = hierarchy.find(n => n.name === 'A')
            expect(nodeA).toBeDefined()
            // Use non-null assertion since we expect it to exist based on test data
            // @ts-expect-error - suppress strictNullChecks in tests
            expect(nodeA.children).toHaveLength(2) // B and C

            // @ts-expect-error - suppress strictNullChecks in tests
            const nodeB = nodeA.children.find(n => n.name === 'B')
            expect(nodeB).toBeDefined()
            // @ts-expect-error - suppress strictNullChecks in tests
            expect(nodeB.value).toBe(10)
          },
        )

        it(
          'should handle missing values gracefully',
          () => {
            const data = [
              { path: 'A/B' }, // No value
            ]
            const option = transformDataToChartOption(
              data,
              'path',
              '',
              'sunburst',
              {
                valueProp: 'val',
              },
            )

            expect(Array.isArray(option.series)).toBe(true)
            expect(option.series).not.toHaveLength(0)
            expect(option.series).not.toHaveLength(0)
            expect(option.series).not.toHaveLength(0)
            if (!Array.isArray(option.series) || option.series.length === 0) {
              return
            }

            const hierarchy = hierarchyRoots(firstSunburstSeries(option))

            // @ts-expect-error - suppress strictNullChecks in tests
            expect(hierarchy[0].children[0].value).toBeUndefined()
          },
        )
      },
    )

    describe(
      'Tree',
      () => {
        it(
          'should build hierarchy and wrap in single root if multiple roots',
          () => {
            const data = [
              { path: 'A/B' },
              { path: 'C/D' },
            ]
            const option = transformDataToChartOption(
              data,
              'path',
              '',
              'tree',
              {},
            )

            expect(Array.isArray(option.series)).toBe(true)
            if (!Array.isArray(option.series) || option.series.length === 0) {
              return
            }

            const dataRoot = hierarchyRoots(firstTreeSeries(option))
            // Should be wrapped in "Root" because there are two top-level nodes (A and C)
            expect(dataRoot).toHaveLength(1)
            // @ts-expect-error - suppress strictNullChecks in tests
            expect(dataRoot[0].name).toBe('Root')
            // @ts-expect-error - suppress strictNullChecks in tests
            expect(dataRoot[0].children).toHaveLength(2)
          },
        )

        it(
          'should use single root directly if only one top-level node',
          () => {
            const data = [
              { path: 'A/B' },
              { path: 'A/C' },
            ]
            const option = transformDataToChartOption(
              data,
              'path',
              '',
              'tree',
              {},
            )

            expect(Array.isArray(option.series)).toBe(true)
            if (!Array.isArray(option.series) || option.series.length === 0) {
              return
            }

            const dataRoot = hierarchyRoots(firstTreeSeries(option))
            // Should be just A, no wrapper
            expect(dataRoot).toHaveLength(1)
            // @ts-expect-error - suppress strictNullChecks in tests
            expect(dataRoot[0].name).toBe('A')
          },
        )
      },
    )
  },
)
