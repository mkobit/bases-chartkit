import type { EChartsOption, GraphSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, isRecord, safeToString } from './bases-values'
import { formatValue } from './formatters'
import { getLegendOption } from './legend'
import { getCategoricalColor } from './palette'
import { asTooltipFormatter } from './tooltip'
import * as R from 'remeda'

export interface GraphTransformerOptions extends BaseTransformerOptions {
  readonly valueProp?: string // For edge weight
  readonly categoryProp?: string // For node category
  readonly theme?: string
}

export interface GraphTooltipParam {
  readonly name: string
  readonly value?: unknown
}

export function formatGraphTooltip(param: GraphTooltipParam, valueFormat: string): string {
  const rawValue = isRecord(param.value) && 'value' in param.value ? param.value.value : param.value
  return rawValue !== undefined && rawValue !== null && !Number.isNaN(Number(rawValue))
    ? `${param.name} : ${formatValue(rawValue, valueFormat)}`
    : param.name
}

const DEFAULT_NODE_SYMBOL_SIZE = 20
const MIN_NODE_SYMBOL_SIZE = 16
const MAX_NODE_SYMBOL_SIZE = 32

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
  itemStyle?: Readonly<{
    color: string
  }>
}>

type GraphCategory = Readonly<{
  name: string
}>

function computeNodeSymbolSizes(
  nodeNames: readonly string[],
  links: ReadonlyArray<GraphLink>,
): Readonly<Record<string, number>> {
  const hasWeights = links.some(l => l.value !== undefined)
  return !hasWeights
    ? R.fromKeys(nodeNames, _name => DEFAULT_NODE_SYMBOL_SIZE)
    : (() => {
        const weightsByNode: Readonly<Record<string, number>> = R.fromKeys(nodeNames, name =>
          R.sumBy(
            links.filter(l => l.source === name || l.target === name),
            l => l.value ?? 0,
          ),
        )
        const weights: readonly number[] = R.values(weightsByNode)
        const minWeight = Math.min(...weights)
        const maxWeight = Math.max(...weights)

        return maxWeight <= minWeight
          ? R.fromKeys(nodeNames, _name => DEFAULT_NODE_SYMBOL_SIZE)
          : R.mapValues(weightsByNode, weight =>
              Math.round(
                MIN_NODE_SYMBOL_SIZE
                + ((weight - minWeight) / (maxWeight - minWeight))
                * (MAX_NODE_SYMBOL_SIZE - MIN_NODE_SYMBOL_SIZE),
              ),
            )
      })()
}

export function createGraphChartOption(
  data: BasesData,
  sourceProp: string,
  targetProp: string,
  options?: GraphTransformerOptions,
): EChartsOption {
  const valueProp = options?.valueProp
  const categoryProp = options?.categoryProp

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

            const valNum = valueProp
              ? Number(getNestedValue(
                  item,
                  valueProp,
                ))
              : Number.NaN
            const val = Number.isNaN(valNum) ? undefined : valNum

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

  const groupedNodes = R.pipe(
    [...sources,
      ...targets],
    R.groupBy(x => x.name),
  )

  const symbolSizes = computeNodeSymbolSizes(R.keys(groupedNodes), links)

  // Merge nodes by name, preferring the one with category
  const nodesData: ReadonlyArray<GraphNode> = R.pipe(
    groupedNodes,
    R.mapValues((group: ReadonlyArray<GraphNodeRef>, name: string): GraphNode => {
      const withCat = group.find(x => x.category !== undefined)
      return {
        name,
        category: withCat?.category,
        symbolSize: symbolSizes[name] ?? DEFAULT_NODE_SYMBOL_SIZE,
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

  const hasCategories = categoriesList.length > 0

  const finalNodesData: ReadonlyArray<GraphNode> = R.map(
    nodesData,
    (node): GraphNode => node.category !== undefined
      ? node
      : {
          ...node,
          itemStyle: { color: getCategoricalColor(node.name) },
        },
  )

  const categoriesData: ReadonlyArray<GraphCategory> = R.map(
    categoriesList,
    (name): GraphCategory => ({ name }),
  )

  const seriesItem: GraphSeriesOption = {
    type: 'graph',
    layout: 'force',
    data: [...finalNodesData],
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

  const valueFormat = options?.valueFormat

  const opt: EChartsOption = {
    tooltip: valueFormat !== undefined
      ? {
          formatter: asTooltipFormatter((param: GraphTooltipParam) => formatGraphTooltip(param, valueFormat)),
        }
      : {},
    ...(getLegendOption(options) && hasCategories
      ? {
          legend: {
            data: [...categoriesList],
            ...getLegendOption(options),
          },
        }
      : {}),
    ...(options?.theme ? { theme: options.theme } : {}),
    series: [seriesItem],
  }

  return opt
}
