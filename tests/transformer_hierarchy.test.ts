import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { SunburstSeriesOption, TreeSeriesOption } from 'echarts'

interface HierarchyNode {
  readonly name: string
  readonly value?: number
  readonly children?: readonly HierarchyNode[]
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

            const series = option.series[0] as SunburstSeriesOption
            expect(series.type).toBe('sunburst')

            // eslint-disable-next-line no-restricted-syntax -- ECharts series.data is `OptionDataItem[]`; narrow to our shape for assertions.
            const hierarchy = series.data as unknown as readonly HierarchyNode[]
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

            const series = option.series[0] as SunburstSeriesOption
            // eslint-disable-next-line no-restricted-syntax -- ECharts series.data narrowed for assertions.
            const hierarchy = series.data as unknown as readonly HierarchyNode[]

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

            const series = option.series[0] as TreeSeriesOption

            // eslint-disable-next-line no-restricted-syntax -- ECharts series.data narrowed for assertions.
            const dataRoot = series.data as unknown as readonly HierarchyNode[]
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

            const series = option.series[0] as TreeSeriesOption

            // eslint-disable-next-line no-restricted-syntax -- ECharts series.data narrowed for assertions.
            const dataRoot = series.data as unknown as readonly HierarchyNode[]
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
