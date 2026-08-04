import type { EChartsOption, SunburstSeriesOption, TreeSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, safeToString } from './utils'
import * as R from 'remeda'

export interface SunburstTransformerOptions extends BaseTransformerOptions {
  readonly valueProp?: string
}

export type TreeTransformerOptions = BaseTransformerOptions

export interface HierarchyNode {
  readonly name: string
  readonly value?: number
  readonly children?: readonly HierarchyNode[]
}

interface PathItem {
  parts: string[]
  value: number | undefined
}

function asSunburstData(data: readonly HierarchyNode[]): SunburstSeriesOption['data'] {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-restricted-syntax -- our HierarchyNode tree shape structurally matches ECharts' sunburst data nodes; bridge past the wide OptionDataValue union.
  return data as unknown as SunburstSeriesOption['data']
}

function asTreeData(data: readonly HierarchyNode[]): TreeSeriesOption['data'] {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-restricted-syntax -- our HierarchyNode tree shape structurally matches ECharts' tree data nodes; bridge past the wide OptionDataValue union.
  return data as unknown as TreeSeriesOption['data']
}

/**
 * Helper to build a tree structure from slash-separated paths.
 */
export function buildHierarchy(
  data: BasesData,
  pathProp: string,
  valueProp?: string,
): readonly HierarchyNode[] {
  const paths = R.pipe(
    data,
    R.map((item) => {
      const pathRaw = getNestedValue(
        item,
        pathProp,
      )
      // `pathRaw` is typically a Bases `Value` wrapper (from `.get()`), not a
      // raw string -- unwrap it via `safeToString` the same way every other
      // transformer does before treating it as text to split on '/'.
      const pathStr = pathRaw === undefined || pathRaw === null ? '' : safeToString(pathRaw)
      return !pathStr
        ? null
        : (() => {
            const parts = pathStr.split('/').filter(p => p.length > 0)
            return parts.length === 0
              ? null
              : (() => {
                  const valNum = valueProp
                    ? Number(getNestedValue(
                        item,
                        valueProp,
                      ))
                    : Number.NaN
                  const value = Number.isNaN(valNum) ? undefined : valNum

                  return { parts,
                    value }
                })()
          })()
    }),
    R.filter((x): x is PathItem => x !== null),
  )

  const buildLevel = (items: readonly PathItem[]): readonly HierarchyNode[] => {
    return R.pipe(
      items,
      R.groupBy(item => item.parts[0]),
      R.entries(),
      R.map(([name,
        group]) => {
        const leafItems = group.filter(item => item.parts.length === 1)
        const leafValue = leafItems.length > 0
          ? R.sumBy(
              leafItems,
              item => item.value ?? 0,
            )
          : undefined

        const childrenItems = group
          .filter(item => item.parts.length > 1)
          .map(item => ({ parts: item.parts.slice(1),
            value: item.value }))

        const children = childrenItems.length > 0 ? buildLevel(childrenItems) : undefined

        const node: HierarchyNode = { name }

        const nodeWithValue = (leafValue !== undefined && leafValue > 0)
          ? { ...node,
              value: leafValue }
          : node

        const nodeWithChildren = children
          ? { ...nodeWithValue,
              children }
          : nodeWithValue

        return nodeWithChildren
      }),
    )
  }

  return buildLevel(paths)
}

export function createSunburstChartOption(
  data: BasesData,
  pathProp: string,
  options?: SunburstTransformerOptions,
): EChartsOption {
  const valueProp = options?.valueProp
  const hierarchyData = buildHierarchy(
    data,
    pathProp,
    valueProp,
  )

  const seriesItem: SunburstSeriesOption = {
    type: 'sunburst',
    data: asSunburstData(hierarchyData),
    radius: [0,
      '90%'],
    label: {
      rotate: 'radial',
    },
  }

  return {
    series: [seriesItem],
    tooltip: {
      trigger: 'item',
    },
  }
}

export function createTreeChartOption(
  data: BasesData,
  pathProp: string,
  _options?: TreeTransformerOptions,
): EChartsOption {
  const hierarchyDataRaw = buildHierarchy(
    data,
    pathProp,
  )

  const hierarchyData = hierarchyDataRaw.length > 1
    ? [{ name: 'Root',
        children: hierarchyDataRaw }]
    : hierarchyDataRaw

  const seriesItem: TreeSeriesOption = {
    type: 'tree',
    data: asTreeData(hierarchyData),
    top: '10%',
    bottom: '10%',
    layout: 'orthogonal',
    symbol: 'emptyCircle',
    symbolSize: 7,
    initialTreeDepth: 3,
    animationDurationUpdate: 750,
    label: {
      position: 'left',
      verticalAlign: 'middle',
      align: 'right',
      fontSize: 9,
    },
    leaves: {
      label: {
        position: 'right',
        verticalAlign: 'middle',
        align: 'left',
      },
    },
    expandAndCollapse: true,
    animationDuration: 550,
    animationEasing: 'cubicOut',
  }

  return {
    series: [seriesItem],
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
    },
  }
}
