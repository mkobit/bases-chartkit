import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import type { TreemapSeriesOption } from 'echarts'

interface HierarchyNode {
  readonly name: string
  readonly value?: number
  readonly children?: readonly HierarchyNode[]
}

describe(
  'Treemap Transformer',
  () => {
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

        const series = option.series as readonly TreemapSeriesOption[]
        expect(series).toBeDefined()
        expect(series.length).toBe(1)
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(series[0].type).toBe('treemap')

        // eslint-disable-next-line no-restricted-syntax -- ECharts series data is a wide OptionDataValue union; narrow to our HierarchyNode shape for assertions.
        const hierarchy = series[0]?.data as unknown as readonly HierarchyNode[]
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
      'should disable the built-in breadcrumb so it does not duplicate the top-level label',
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

        const series = option.series as readonly TreemapSeriesOption[]
        expect(series[0]?.breadcrumb?.show).toBe(false)
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
        const series = option.series as readonly TreemapSeriesOption[]

        // eslint-disable-next-line no-restricted-syntax -- ECharts series data is a wide OptionDataValue union; narrow to our HierarchyNode shape for assertions.
        const hierarchy = series?.[0]?.data as unknown as readonly HierarchyNode[]
        expect(hierarchy).toHaveLength(1)
        expect(hierarchy[0]?.value).toBeUndefined()
      },
    )
  },
)
