import type { Page } from '@playwright/test'
import { test, expect } from './fixtures/obsidian'
import { asOptionLike, evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface TreemapSeriesLike {
  readonly type?: string
  readonly itemStyle?: { readonly borderColor?: string }
  readonly upperLabel?: { readonly show?: boolean }
  readonly levels?: ReadonlyArray<{ readonly itemStyle?: { readonly gapWidth?: number } }>
}

interface HierarchyLeaf {
  readonly name: string
  readonly value: number
  readonly dataIndex: number
}

/**
 * Walks the live ECharts 'treemap' series' internal Tree model (treemap
 * shares src/data/Tree.js and its virtual-root wrapping with tree/sunburst --
 * see TreemapSeriesModel#getInitialData) to find a real leaf node -- one
 * with no children of its own -- and its actual dataIndex. buildHierarchy
 * (src/charts/transformers/hierarchy.ts) groups notes by slash-delimited
 * Path segments and sums values for any notes sharing an exact leaf path, so
 * no dataIndex/value pair is safely predictable from a single note's raw
 * frontmatter; reading it back off the already-built model sidesteps
 * hand-simulating that grouping. Every level renders simultaneously as a
 * nested rect (the transformer sets no `leafDepth`), so a deep leaf is just
 * as hoverable as a top-level node.
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

test.describe('treemap chart rendering', () => {
  // Regression test (bck-1v4): TreemapChartView.getChartOption used to pass a
  // literal {} instead of getCommonTransformerOptions(), silently dropping
  // every common option before it ever reached the transformer. Note ECharts'
  // getOption() doesn't echo treemap's `data` back (it's converted into an
  // internal tree), so this asserts on a field that does survive round-trip
  // to prove the view->transformer pipeline still renders successfully with
  // real options flowing through instead of {}.
  test('treemap renders with real common options flowing through', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'treemap/Basic.base', viewName: 'Org headcount treemap' })

    await expect.poll(
      async () => {
        const option = asOptionLike<{ readonly series?: readonly unknown[] }>(await getChartOption(page))
        return option?.series?.length ?? 0
      },
      { timeout: 30_000 },
    ).toBeGreaterThan(0)

    const option = asOptionLike<{ readonly series: readonly TreemapSeriesLike[] }>(await getChartOption(page))
    if (option === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected a non-null chart option')
    }
    const treemapSeries = option.series.find(s => s.type === 'treemap')

    expect(treemapSeries?.itemStyle?.borderColor).toBe('transparent')

    // Regression (bck-aie.18): the treemap rendered every branch as an
    // ungrouped grid of leaf tiles -- "no tree map relationship, all flat
    // boxes". The fix makes the nesting legible via non-leaf header strips
    // (upperLabel) and positive per-depth sibling gaps; assert both survive
    // round-trip into the live series.
    expect(treemapSeries?.upperLabel?.show).toBe(true)
    const gapWidths = (treemapSeries?.levels ?? []).map(level => level.itemStyle?.gapWidth ?? 0)
    expect(gapWidths.length).toBeGreaterThanOrEqual(2)
    expect(gapWidths.every(gap => gap > 0)).toBe(true)
  })

  // Regression coverage for bck-44j: extends the bar/radar hover-tooltip
  // pattern to treemap's 'treemap' series. Each node renders as a discrete
  // nested rect (not a zrender-Group like radar), so this only needs a real
  // dataIndex, which findHierarchyLeaf derives dynamically (see its doc
  // comment above). Treemap's transformer sets a custom string-template
  // tooltip.formatter ('{b}: {c}'), so the tooltip is exactly
  // '<name>: <value>', not the default 'nameValue' markup tree/sunburst use.
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
    }, { path: 'treemap/Basic.base', viewName: 'Org headcount treemap' })

    await expect.poll(
      () => findHierarchyLeaf(page),
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).not.toBeNull()

    // Bases can still be re-rendering (a later setOption call landing as
    // indexing catches up) even after the poll above finds a leaf -- a
    // dataIndex captured from an earlier, still-settling tree can point to a
    // node that no longer exists (or exists at a different index) by the
    // time the hover below runs. Wait for full indexing first so this read
    // and hoverChartDataPointAndGetTooltip's own internal wait observe the
    // same, final tree.
    await waitForVaultIndexed(page)

    const leafNode = await findHierarchyLeaf(page)
    if (leafNode === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('no leaf node found in the treemap series after polling succeeded')
    }

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: leafNode.dataIndex })

    expect(tooltipText).toContain(`${leafNode.name}: ${leafNode.value}`)
  })
})
