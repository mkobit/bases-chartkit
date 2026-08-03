import type { Page } from '@playwright/test'
import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface HierarchyLeaf {
  readonly name: string
  readonly value: number
  readonly dataIndex: number
}

/**
 * Walks the live ECharts 'sunburst' series' internal Tree model (sunburst
 * shares src/data/Tree.js and its virtual-root wrapping with tree/treemap --
 * see SunburstSeriesModel#getInitialData) to find a real leaf node -- one
 * with no children of its own -- and its actual dataIndex. buildHierarchy
 * (src/charts/transformers/hierarchy.ts) groups notes by slash-delimited
 * Path segments and sums values for any notes sharing an exact leaf path, so
 * no dataIndex/value pair is safely predictable from a single note's raw
 * frontmatter; reading it back off the already-built model sidesteps
 * hand-simulating that grouping.
 */
async function findHierarchyLeaf(page: Page, seriesIndex = 0): Promise<HierarchyLeaf | null> {
  return evaluateObsidian(page, (app, a: { seriesIndex: number }) => {
    interface TreeNodeLike {
      readonly name: string
      readonly children: readonly TreeNodeLike[]
      readonly dataIndex: number
      readonly getValue: () => unknown
    }
    interface SeriesDataLike {
      readonly tree?: { readonly root: TreeNodeLike }
    }
    interface SeriesModelLike {
      readonly getData: () => SeriesDataLike
    }
    interface EChartsModelLike {
      readonly getSeriesByIndex: (index: number) => SeriesModelLike | undefined
    }
    interface ChartLike {
      readonly chart: { readonly getModel: () => EChartsModelLike } | null
    }

    const isChartView = (obj: unknown): obj is ChartLike => {
      if (obj === null || typeof obj !== 'object') {
        return false
      }
      if (!('getChartOption' in obj) || !('chart' in obj)) {
        return false
      }
      return typeof obj.getChartOption === 'function' && obj.chart !== undefined
    }

    const findChartView = (obj: unknown, depth: number, visited: readonly unknown[]): ChartLike | undefined => {
      if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
        return undefined
      }
      if (depth > 8 || visited.includes(obj)) {
        return undefined
      }
      if (isChartView(obj)) {
        return obj
      }
      const nextVisited = [...visited, obj]
      const values: readonly unknown[] = Object.values(obj)
      return values
        .map(value => findChartView(value, depth + 1, nextVisited))
        .find((found): found is ChartLike => found !== undefined)
    }

    const leaves = [
      app.workspace.getLeaf(false),
      ...app.workspace.getLeavesOfType('bases'),
    ]

    const chartView = leaves
      .map(leaf => leaf ? findChartView(leaf.view, 0, []) : undefined)
      .find((view): view is ChartLike => view !== undefined)

    const root = chartView?.chart?.getModel().getSeriesByIndex(a.seriesIndex)?.getData().tree?.root
    if (!root) {
      return null
    }

    // Depth-first, first-child-first: return the first node with no
    // children of its own and a finite numeric value.
    const findLeaf = (node: TreeNodeLike): HierarchyLeaf | undefined => {
      if (node.children.length === 0) {
        const value = node.getValue()
        return typeof value === 'number' && Number.isFinite(value)
          ? { name: node.name, value, dataIndex: node.dataIndex }
          : undefined
      }
      return node.children.map(findLeaf).find((found): found is HierarchyLeaf => found !== undefined)
    }

    return findLeaf(root) ?? null
  }, { seriesIndex })
}

test.describe('sunburst chart rendering', () => {
  // Regression coverage for bck-44j: extends the bar/radar hover-tooltip
  // pattern to sunburst's 'sunburst' series. Each hierarchy level renders as
  // a ring of arc/sector shapes (a discrete shape per dataIndex, not a
  // zrender-Group like radar), so this only needs a real dataIndex, which
  // findHierarchyLeaf derives dynamically (see its doc comment above).
  // Sunburst's transformer sets no custom tooltip.formatter, so ECharts'
  // default 'nameValue' markup applies: the leaf's own name and value, no
  // ancestor breadcrumb (unlike tree's formatTooltip override).
  // Fixed for bck-44x: live runs consistently found the CORRECT leaf via
  // findHierarchyLeaf (dataIndex resolution itself was never wrong -- a
  // live diagnostic confirmed node.dataIndex and getData()'s own indexing
  // agreed perfectly at every index), but hovering that dataIndex's computed
  // screen position landed on an ANCESTOR ring instead. Root cause was in
  // getSeriesItemScreenPosition, not this file: sunburst's per-node graphic
  // element is a zrender Sector (an annular wedge), and a wide-angle wedge's
  // rectangular bounding-box center commonly falls inside a different,
  // smaller-radius ring's sector rather than the wedge itself -- worse the
  // wider the wedge, so the single largest-value top-level child was hit
  // every time. Fixed by computing sector positions from the shape's own
  // angle/radius midpoint instead of its bounding-rect center.
  test('hovering a leaf node shows its name and value in the tooltip', async ({ obsidianPage: { page } }) => {
    await evaluateObsidian(page, async (app, args: { path: string, viewName: string }) => {
      await new Promise<void>((resolve) => {
        app.workspace.onLayoutReady(() => resolve())
      })
      const leaf = app.workspace.getLeaf('tab')
      await leaf.setViewState({
        type: 'bases',
        state: { file: args.path, viewName: args.viewName },
        active: true,
      })
    }, { path: 'sunburst/Basic.base', viewName: 'Project tasks sunburst' })

    await waitForVaultIndexed(page)

    // waitForVaultIndexed alone isn't a sufficient settling signal here: a
    // live run showed a dataIndex captured right after it resolved could
    // still point to a node from an earlier tree shape, one microtask before
    // Bases' own final re-render landed. Mirror
    // hoverChartDataPointAndGetTooltip's own position-stability poll, but
    // applied to the tree structure itself -- keep re-deriving the leaf
    // until two consecutive reads agree on the exact same node (dataIndex,
    // name, and value all matching), which is the earliest point a captured
    // dataIndex is guaranteed to still be valid by the time hover uses it.
    let previousLeaf: Awaited<ReturnType<typeof findHierarchyLeaf>> = null
    await expect.poll(async () => {
      const leaf = await findHierarchyLeaf(page)
      const stable = leaf !== null && previousLeaf !== null
        && leaf.dataIndex === previousLeaf.dataIndex
        && leaf.name === previousLeaf.name
        && leaf.value === previousLeaf.value
      previousLeaf = leaf
      return stable
    }, { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS, intervals: [100] }).toBe(true)

    // Re-read directly rather than trusting `previousLeaf` from inside the
    // poll's closure -- TypeScript can't narrow a `let` across a closure
    // boundary the way it can a fresh `const`, and the two consecutive
    // matches just confirmed above make this read exactly as safe.
    const leafNode = await findHierarchyLeaf(page)
    if (leafNode === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('no leaf node found in the sunburst series after polling succeeded')
    }

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: leafNode.dataIndex })

    expect(tooltipText).toContain(leafNode.name)
    expect(tooltipText).toContain(String(leafNode.value))
  })
})
