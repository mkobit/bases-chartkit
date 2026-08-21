import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { EChartsOption, TreemapSeriesOption } from 'echarts'

interface HierarchyNode {
  readonly name: string
  readonly value?: number
  readonly children?: readonly HierarchyNode[]
}

// EChartsOption['series'] is a `type`-discriminated union, so filtering on the
// literal `type` narrows each element to TreemapSeriesOption with no cast.
function treemapSeriesList(option: EChartsOption): readonly TreemapSeriesOption[] {
  const rawSeries = Array.isArray(option.series)
    ? option.series
    : option.series === undefined ? [] : [option.series]
  return rawSeries.flatMap(series => series.type === 'treemap' ? [series] : [])
}

// TreemapSeriesOption['data'] is a wide OptionDataValue union with no
// discriminant TS can check -- this is a genuine runtime shape check against
// our HierarchyNode tree rather than an unverified cast.
function isHierarchyNode(value: unknown): value is HierarchyNode {
  return typeof value === 'object' && value !== null
    && 'name' in value && typeof value.name === 'string'
    && (!('value' in value) || typeof value.value === 'number')
    && (!('children' in value) || (Array.isArray(value.children) && value.children.every(isHierarchyNode)))
}

function treemapHierarchy(series: TreemapSeriesOption | undefined): readonly HierarchyNode[] {
  const data = series?.data
  return Array.isArray(data) ? data.flatMap(node => isHierarchyNode(node) ? [node] : []) : []
}

describe(
  'Treemap Transformer',
  () => {
    it(
      'should reject hierarchy nodes with malformed children',
      () => {
        expect(isHierarchyNode({ name: 'Project', children: [{ name: 123 }] })).toBe(false)
      },
    )

    it(
      'should build nested hierarchy from slash-separated path property',
      () => {
        const data = [
          { path: 'Project/Frontend/UI',
            val: 10 },
          { path: 'Project/Backend/API',
            val: 20 },
          { path: 'Project/Backend/DB',
            val: 5 },
        ]

        const option = transformDataToChartOption(
          data,
          'path',
          'val',
          'treemap',
          {},
        )

        const series = treemapSeriesList(option)
        expect(series).toBeDefined()
        expect(series.length).toBe(1)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].type).toBe('treemap')

        const hierarchy = treemapHierarchy(series[0])
        expect(hierarchy).toHaveLength(1) // single top-level node: Project

        const project = hierarchy[0]
        expect(project?.name).toBe('Project')
        expect(project?.children).toHaveLength(2) // Frontend and Backend

        const backend = project?.children?.find(n => n.name === 'Backend')
        expect(backend?.children).toHaveLength(2) // API and DB

        const api = backend?.children?.find(n => n.name === 'API')
        expect(api?.value).toBe(20)
      },
    )

    it(
      'should enable the built-in breadcrumb so a zoomed-in node can be navigated back out',
      () => {
        const data = [{ path: 'A/B',
          val: 10 }]

        const option = transformDataToChartOption(
          data,
          'path',
          'val',
          'treemap',
          {},
        )

        const series = treemapSeriesList(option)
        expect(series[0]?.breadcrumb?.show).toBe(true)
      },
    )

    it(
      'should use a transparent border instead of ECharts\' hardcoded white default',
      () => {
        const data = [{ path: 'A/B',
          val: 10 }]

        const option = transformDataToChartOption(
          data,
          'path',
          'val',
          'treemap',
          {},
        )

        const series = treemapSeriesList(option)
        // Regression: ECharts' treemap default itemStyle.borderColor is an
        // opaque white with no dark-theme override, so an explicit
        // transparent border is required to avoid a hardcoded-white
        // artifact on dark backgrounds.
        expect(series[0]?.itemStyle).toEqual({ borderColor: 'transparent' })
      },
    )

    it(
      'should show non-leaf node names in a header strip so the hierarchy is legible',
      () => {
        // Regression: with ECharts' upperLabel default (show:false) every branch
        // collapsed into an ungrouped grid of leaf tiles -- the "all flat boxes,
        // no tree map relationship" bug. Header strips label each parent tile.
        const data = [{ path: 'A/B/C',
          val: 10 }]

        const option = transformDataToChartOption(
          data,
          'path',
          'val',
          'treemap',
          {},
        )

        const series = treemapSeriesList(option)
        expect(series[0]?.upperLabel?.show).toBe(true)
      },
    )

    it(
      'should gap sibling tiles per depth so parents visibly contain their children',
      () => {
        // Regression: at ECharts' default gapWidth:0 sibling tiles butt together
        // with no visible parent framing, so nested branches read as flat. Each
        // level must define a positive gap; gaps shrink with depth.
        const data = [{ path: 'A/B/C',
          val: 10 }]

        const option = transformDataToChartOption(
          data,
          'path',
          'val',
          'treemap',
          {},
        )

        const series = treemapSeriesList(option)
        const levels = series[0]?.levels
        expect(levels).toBeDefined()
        expect(levels?.length).toBeGreaterThanOrEqual(2)

        const gaps = (levels ?? []).map(level => level.itemStyle?.gapWidth ?? 0)
        // Every level frames its children, and the framing tapers toward leaves.
        expect(gaps.every(g => g > 0)).toBe(true)
        expect(gaps[0]).toBeGreaterThan(gaps[gaps.length - 1] ?? 0)
      },
    )

    it(
      'should handle missing values gracefully',
      () => {
        const data = [
          { path: 'A' }, // missing val
        ]

        const option = transformDataToChartOption(
          data,
          'path',
          'val',
          'treemap',
          {},
        )
        const series = treemapSeriesList(option)

        const hierarchy = treemapHierarchy(series[0])
        expect(hierarchy).toHaveLength(1)
        expect(hierarchy[0]?.value).toBeUndefined()
      },
    )
  },
)
