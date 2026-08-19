import { test, expect } from './fixtures/obsidian'
import { asOptionLike, evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface GraphOptionLike {
  readonly series?: ReadonlyArray<{ readonly data?: ReadonlyArray<{ readonly name?: string }> }>
}

test.describe('graph chart rendering', () => {
  // Regression coverage for bck-44j: graph nodes render through the same
  // per-dataIndex getItemGraphicEl path as bar/radar -- chart/helper/SymbolDraw.js
  // calls `data.setItemGraphicEl(idx, symbolEl)` for every node, where `Symbol`
  // (chart/helper/Symbol.js) extends zrender's Group (a circle Path child plus
  // an optional label), directly compatible with the existing leaf-shape
  // traversal already proven for radar's Group-based shapes.
  //
  // The other real risk here is the 'force' layout's physics simulation, not
  // the graphic-element model: it is NOT perpetual. chart/graph/forceHelper.js's
  // step() decays `friction` by *0.992 every iteration starting from the
  // default 0.6, and GraphView.js stops scheduling further steps once
  // `friction < 0.01` (~510 iterations). At the default 16ms
  // `force.layoutAnimation` tick that's roughly 8s to genuinely stop moving --
  // comfortably inside this helper's 100s stability-poll budget. `roam: true`
  // (set by transformers/graph.ts) only enables user pan/zoom; it does not
  // itself keep the force simulation ticking.
  test('hovering a graph node shows its name in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'graph/Basic.base', viewName: 'Network topology (graph)' })

    await expect.poll(
      async () => {
        const opt = asOptionLike<GraphOptionLike>(await getChartOption(page))
        return opt?.series?.[0]?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // transformers/graph.ts's nodesData dedups every unique Source/Target name
    // via R.groupBy + R.values() -- that dedup order isn't something to
    // hand-derive from the raw notes, so read the real node name at
    // dataIndex 0 from the live option instead. Wait for full indexing first:
    // Bases can still be re-rendering after the poll above finds a non-empty
    // series, and reading the node name from an earlier, still-settling
    // render risks it not matching what's on screen by hover time.
    await waitForVaultIndexed(page)
    const option = asOptionLike<GraphOptionLike>(await getChartOption(page))
    const nodeName = option?.series?.[0]?.data?.[0]?.name ?? ''
    expect(nodeName.length).toBeGreaterThan(0)

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain(nodeName)
  })
})
