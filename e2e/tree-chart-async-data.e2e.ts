import type { Page } from '@playwright/test'
import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface HierarchyLeaf {
  readonly name: string
  readonly fullPath: string
  readonly dataIndex: number
}

/**
 * Walks the live ECharts 'tree' series' internal Tree model (the same
 * structure TreeSeriesModel#formatTooltip reads via `getData().tree`) to
 * find a real leaf node -- one with no children of its own -- and its actual
 * dataIndex. buildHierarchy (src/charts/transformers/hierarchy.ts) groups
 * notes by slash-delimited Path segments and sums values for any notes
 * sharing an exact leaf path, so no dataIndex is safely predictable from a
 * single note's raw frontmatter; reading it back off the already-built model
 * sidesteps hand-simulating that grouping.
 *
 * Does not read node.getValue(): unlike sunburst/treemap, TreeSeriesModel
 * sets up no 'value' dimension at all (tree's orthogonal layout is purely
 * structural, not value-sized), so getValue() always returns null here --
 * confirmed via a live diagnostic dumping every node's value. The original
 * findLeaf required a finite numeric value before accepting a node as a
 * leaf, which no tree node could ever satisfy, so it always returned
 * undefined -- not a timing/stability bug in the poll below, an always-false
 * predicate that could never converge within any budget.
 *
 * fullPath mirrors TreeSeriesModel.prototype.formatTooltip's own ancestor-
 * breadcrumb construction (dot-joined names from the tree's real root down
 * to this leaf) exactly, since that -- not a bare name -- is what the
 * tooltip actually renders for a 'tree' series with tooltip.trigger:'item'.
 */
async function findHierarchyLeaf(page: Page, seriesIndex = 0): Promise<HierarchyLeaf | null> {
  return evaluateObsidian(page, (app, a: { seriesIndex: number }) => {
    interface TreeNodeLike {
      readonly name: string
      readonly children: readonly TreeNodeLike[]
      readonly dataIndex: number
      readonly parentNode: TreeNodeLike | null
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
    // children of its own.
    const findLeaf = (node: TreeNodeLike): TreeNodeLike | undefined => {
      if (node.children.length === 0) {
        return node
      }
      return node.children.map(findLeaf).find((found): found is TreeNodeLike => found !== undefined)
    }

    const leafNode = findLeaf(root)
    if (!leafNode) {
      return null
    }

    // Mirrors TreeSeriesModel.prototype.formatTooltip exactly: dot-join
    // names from the real root (the virtual root's own single child) down
    // to this leaf.
    const realRoot = root.children[0] ?? null
    let name = leafNode.name
    let cursor: TreeNodeLike | null = leafNode
    while (cursor && cursor !== realRoot && cursor.parentNode) {
      name = `${cursor.parentNode.name}.${name}`
      cursor = cursor.parentNode
    }

    return { name: leafNode.name, fullPath: name, dataIndex: leafNode.dataIndex }
  }, { seriesIndex })
}

test.describe('tree chart async data update', () => {
  // Regression test for obsidian-bases-charts-fs4.3: Bases resolves its query
  // asynchronously, so the tree-chart view's first render often mounts before
  // any rows arrive. ECharts' `tree` series throws internally
  // ("Cannot read properties of null (reading '0')") when a later `setOption`
  // transitions away from that empty first render, because it tries to
  // reconcile expand/collapse view-state against a previous render that had
  // no root node -- silently freezing the chart on a blank/empty state
  // forever. TreeChartView.executeRender() now clears the chart before every
  // render to avoid the stale diffing state.
  test('renders the full hierarchy once Bases data resolves, not just the empty first paint', async ({ obsidianPage: { page } }) => {
    await evaluateObsidian(page, async (app, args: { path: string, viewName: string }) => {
      await new Promise<void>((resolve) => {
        app.workspace.onLayoutReady(() => {
          resolve()
        })
      })
      const leaf = app.workspace.getLeaf('tab')
      await leaf.setViewState({
        type: 'bases',
        state: { file: args.path, viewName: args.viewName },
        active: true,
      })
    }, { path: 'tree/Basic.base', viewName: 'Project tasks tree' })

    await expect.poll(async () => evaluateObsidian(page, (app) => {
      // The tree-chart view is nested inside Bases' own container view, at a
      // depth that isn't part of any public API. Walk the object graph
      // looking for the instance with a `getChartOption` method (our
      // BaseChartView subclass) rather than hardcoding child indices.
      interface ChartLike {
        chart: { getOption: () => { series?: readonly { data?: readonly unknown[] }[] } }
      }

      function isChartView(obj: unknown): obj is ChartLike {
        if (obj === null || typeof obj !== 'object') {
          return false
        }
        const candidate = obj as Record<string, unknown>
        const chart = candidate.chart as Record<string, unknown> | undefined
        return typeof candidate.getChartOption === 'function' && typeof chart?.getOption === 'function'
      }

      function findChartView(obj: unknown, depth: number, visited: readonly unknown[]): ChartLike | undefined {
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
        for (const value of Object.values(obj as Record<string, unknown>)) {
          const found = findChartView(value, depth + 1, nextVisited)
          if (found) {
            return found
          }
        }
        return undefined
      }

      const activeLeafView = app.workspace.getLeaf(false).view
      const chartView = findChartView(activeLeafView, 0, [])
      const option = chartView?.chart.getOption()
      return option?.series?.[0]?.data?.length ?? 0
    // tree/ sorts alphabetically after all three large-volume chart-type
    // directories (calendar, heatmap, theme-river) -- the highest cold-start
    // indexing risk in the suite.
    }), { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS }).toBeGreaterThan(0)
  })
})

test.describe('tree chart rendering', () => {
  // Regression coverage for bck-44j: extends the bar/radar hover-tooltip
  // pattern to tree's 'tree' series. Nodes render as discrete emptyCircle
  // symbols (the transformer's `symbol: 'emptyCircle'`), so this doesn't need
  // radar's leaf-shape traversal for a zrender-Group -- only a real dataIndex,
  // which findHierarchyLeaf derives dynamically (see its doc comment above).
  // Fixed for bck-44x: the stability poll below never converged within the
  // 100s budget -- not because the tree structure kept changing (a live
  // diagnostic sampling it every 500ms found it byte-for-byte identical from
  // the first read onward), but because findHierarchyLeaf's old predicate
  // required a finite numeric node.getValue() before accepting a leaf.
  // TreeSeriesModel sets up no 'value' dimension at all (unlike sunburst/
  // treemap), so getValue() always returned null and the predicate could
  // never be satisfied -- the poll was waiting on something that could never
  // happen, not racing a genuinely unstable render. findHierarchyLeaf now
  // accepts any childless node and separately computes the dot-joined
  // ancestor path formatTooltip actually renders (see its doc comment).
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
    }, { path: 'tree/Basic.base', viewName: 'Project tasks tree' })

    await waitForVaultIndexed(page)

    // waitForVaultIndexed alone isn't a sufficient settling signal here: a
    // live run showed a dataIndex captured right after it resolved could
    // still point to a node from an earlier tree shape, one microtask before
    // Bases' own final re-render landed. Mirror
    // hoverChartDataPointAndGetTooltip's own position-stability poll, but
    // applied to the tree structure itself -- keep re-deriving the leaf
    // until two consecutive reads agree on the exact same node (dataIndex,
    // name, and fullPath all matching), which is the earliest point a
    // captured dataIndex is guaranteed to still be valid by the time hover
    // uses it.
    let previousLeaf: Awaited<ReturnType<typeof findHierarchyLeaf>> = null
    await expect.poll(async () => {
      const leaf = await findHierarchyLeaf(page)
      const stable = leaf !== null && previousLeaf !== null
        && leaf.dataIndex === previousLeaf.dataIndex
        && leaf.name === previousLeaf.name
        && leaf.fullPath === previousLeaf.fullPath
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
      throw new Error('no leaf node found in the tree series after polling succeeded')
    }

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: leafNode.dataIndex })

    // TreeSeriesModel.prototype.formatTooltip renders the dot-joined
    // ancestor path as the name, with noValue:true since this series has no
    // 'value' dimension -- there's no separate numeric value to assert on.
    expect(tooltipText).toContain(leafNode.fullPath)
  })
})
