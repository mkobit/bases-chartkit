import type { EChartsOption, SankeySeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue } from './utils'
import * as R from 'remeda'

export interface SankeyTransformerOptions extends BaseTransformerOptions {
  readonly valueProp?: string
}

interface SankeyLink {
  readonly source: string
  readonly target: string
  readonly value: number
}

function buildLinks(
  data: BasesData,
  sourceProp: string,
  targetProp: string,
  valueProp?: string,
): readonly SankeyLink[] {
  return R.pipe(
    data,
    R.map((item) => {
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
            const value = Number.isNaN(valNum) ? 1 : valNum

            return { source,
              target,
              value }
          })()
        : null
    }),
    R.filter((x): x is SankeyLink => x !== null),
    // ECharts' sankey series throws ("Self link is not allowed") on any
    // source === target row -- drop those rather than crashing the render.
    R.filter(link => link.source !== link.target),
  )
}

interface CycleVisitState {
  readonly visiting: ReadonlySet<string>
  readonly visited: ReadonlySet<string>
}

interface CycleSearchResult {
  readonly hasCycle: boolean
  readonly state: CycleVisitState
}

function detectCycleFrom(
  node: string,
  adjacency: Record<string, readonly string[]>,
  state: CycleVisitState,
): CycleSearchResult {
  return state.visited.has(node)
    ? { hasCycle: false, state }
    : state.visiting.has(node)
      ? { hasCycle: true, state }
      : (() => {
          const nextState: CycleVisitState = {
            visiting: new Set([...state.visiting, node]),
            visited: state.visited,
          }
          const neighbors = adjacency[node] ?? []

          const result = neighbors.reduce<CycleSearchResult>(
            (acc, neighbor) => (acc.hasCycle ? acc : detectCycleFrom(neighbor, adjacency, acc.state)),
            { hasCycle: false, state: nextState },
          )

          return result.hasCycle
            ? result
            : {
                hasCycle: false,
                state: { visiting: state.visiting, visited: new Set([...result.state.visited, node]) },
              }
        })()
}

// ECharts' sankey series requires a DAG and throws ("sankey is a directed
// acyclic graph") at render time otherwise -- callers must check this before
// handing links to ECharts, since a cycle can't be filtered row-by-row the
// way a self-loop can.
export function hasSankeyCycle(
  data: BasesData,
  sourceProp: string,
  targetProp: string,
): boolean {
  const links = buildLinks(
    data,
    sourceProp,
    targetProp,
  )

  const adjacency = R.pipe(
    links,
    R.groupBy(l => l.source),
    R.mapValues(group => group.map(l => l.target)),
  )

  const nodeNames = R.pipe(
    links,
    R.flatMap(l => [l.source, l.target]),
    R.unique(),
  )

  return nodeNames.reduce<CycleSearchResult>(
    (acc, name) => (acc.hasCycle ? acc : detectCycleFrom(name, adjacency, acc.state)),
    { hasCycle: false, state: { visiting: new Set<string>(), visited: new Set<string>() } },
  ).hasCycle
}

export function createSankeyChartOption(
  data: BasesData,
  sourceProp: string,
  targetProp: string,
  options?: SankeyTransformerOptions,
): EChartsOption {
  const links = buildLinks(
    data,
    sourceProp,
    targetProp,
    options?.valueProp,
  )

  const nodes = R.pipe(
    links,
    R.flatMap(l => [l.source,
      l.target]),
    R.unique(),
    R.map(name => ({ name })),
  )

  const seriesItem: SankeySeriesOption = {
    type: 'sankey',
    data: nodes,
    links: [...links],
    emphasis: {
      focus: 'adjacency',
    },
    label: {
      show: true,
    },
  }

  return {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
    },
    series: [seriesItem],
  }
}
