import type { EChartsOption, GraphSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption } from './utils'
import * as R from 'remeda'

export interface GraphTransformerOptions extends BaseTransformerOptions {
  readonly valueProp?: string // For edge weight
  readonly categoryProp?: string // For node category
}

type GraphLinkRow = Readonly<{
  source: string
  target: string
  value: number | undefined
  category: string | undefined
}>

type GraphLink = Readonly<{
  source: string
  target: string
  value: number | undefined
}>

type GraphNodeRef = Readonly<{
  name: string
  category: string | undefined
}>

type GraphNode = Readonly<{
  name: string
  category: string | undefined
  symbolSize: number
  draggable: boolean
}>

type GraphCategory = Readonly<{
  name: string
}>

export function createGraphChartOption(
  data: BasesData,
  sourceProp: string,
  targetProp: string,
  options?: GraphTransformerOptions,
): EChartsOption {
  const valueProp = options?.valueProp
  const categoryProp = options?.categoryProp

  // 1. Process data to get raw links and node info
  const processedData: ReadonlyArray<GraphLinkRow> = R.pipe(
    data,
    R.map((item): GraphLinkRow | null => {
      const sourceRaw = getNestedValue(
        item,
        sourceProp,
      )
      const targetRaw = getNestedValue(
        item,
        targetProp,
      )

      return (sourceRaw !== null && sourceRaw !== undefined && targetRaw !== null && targetRaw !== undefined)
        ? (() => {
            const source = safeToString(sourceRaw)
            const target = safeToString(targetRaw)

            // Edge Value
            const valNum = valueProp
              ? Number(getNestedValue(
                  item,
                  valueProp,
                ))
              : Number.NaN
            const val = Number.isNaN(valNum) ? undefined : valNum

            // Category (for source node)
            const cRaw = categoryProp
              ? getNestedValue(
                  item,
                  categoryProp,
                )
              : undefined
            const cat = (cRaw !== undefined && cRaw !== null) ? safeToString(cRaw) : undefined

            return { source,
              target,
              value: val,
              category: cat }
          })()
        : null
    }),
    R.filter((x): x is NonNullable<typeof x> => x !== null),
  )

  const links: ReadonlyArray<GraphLink> = R.map(
    processedData,
    ({ source, target, value }): GraphLink => ({ source,
      target,
      value }),
  )

  // 2. Extract Nodes and Categories
  // Collect all nodes from sources and targets
  const sources: ReadonlyArray<GraphNodeRef> = R.map(
    processedData,
    (x): GraphNodeRef => ({ name: x.source,
      category: x.category }),
  )
  const targets: ReadonlyArray<GraphNodeRef> = R.map(
    processedData,
    (x): GraphNodeRef => ({ name: x.target,
      category: undefined }),
  ) // Target categories unknown from this link unless it appears as source elsewhere

  // Merge nodes by name, preferring the one with category
  const nodesData: ReadonlyArray<GraphNode> = R.pipe(
    [...sources,
      ...targets],
    R.groupBy(x => x.name),
    R.mapValues((group: ReadonlyArray<GraphNodeRef>): GraphNode => {
      const withCat = group.find(x => x.category !== undefined)
      return {
        name: group[0].name,
        category: withCat?.category,
        symbolSize: 20,
        draggable: true,
      }
    }),
    R.values(),
  )

  const categoriesList: readonly string[] = R.pipe(
    nodesData,
    R.map(x => x.category),
    R.filter((x): x is string => x !== undefined),
    R.unique(),
    R.sortBy(x => x),
  )

  const categoriesData: ReadonlyArray<GraphCategory> = R.map(
    categoriesList,
    (name): GraphCategory => ({ name }),
  )

  const seriesItem: GraphSeriesOption = {
    type: 'graph',
    layout: 'force',
    data: [...nodesData],
    links: [...links],
    categories: [...categoriesData],
    roam: true,
    label: {
      show: true,
      position: 'right',
      formatter: '{b}',
    },
    labelLayout: {
      hideOverlap: true,
    },
    scaleLimit: {
      min: 0.4,
      max: 2,
    },
    lineStyle: {
      color: 'source',
      curveness: 0.3,
    },
    emphasis: {
      focus: 'adjacency',
      lineStyle: {
        width: 10,
      },
    },
    force: {
      repulsion: 100,
      edgeLength: 100,
    },
  }

  const opt: EChartsOption = {
    tooltip: {},
    ...(getLegendOption(options)
      ? {
          legend: {
            data: [...categoriesList],
            ...getLegendOption(options),
          },
        }
      : {}),
    series: [seriesItem],
  }

  return opt
}
