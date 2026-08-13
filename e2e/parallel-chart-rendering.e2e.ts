import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface ParallelSeriesLike {
  readonly data?: readonly unknown[]
}

test.describe('parallel chart rendering', () => {
  // Regression coverage for bck-44x: parallel is the one chart type where a
  // whole dataIndex renders as a single flat zrender Polyline (one point per
  // axis crossing, confirmed in
  // node_modules/echarts/lib/chart/parallel/ParallelView.js's addEl) rather
  // than a discrete shape or a Group of per-vertex symbols like radar --
  // getSeriesItemScreenPosition's isPolyline branch reads a specific vertex
  // straight out of the rendered shape's own `points` array instead of
  // guessing from a bounding-rect center, which for a zigzag line usually
  // falls in empty space between axes. vertexIndex: 1 (the middle axis,
  // Intelligence) exercises an interior vertex, not an edge one a bbox
  // heuristic might accidentally land on.
  test('hovering a character\'s line at an interior axis shows the whole row in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'parallel/Basic.base', viewName: 'Character stats (parallel)' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly series?: readonly ParallelSeriesLike[] } | null
        return option?.series?.[0]?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Series order is R.groupBy first-occurrence order of `Class`, which
    // follows Bases' row order and is NOT stable across vault-indexing states
    // (verified: series 0 was a Warrior in isolation but a Rogue as spec #25
    // under full-suite load). So derive the expected row FROM the option's
    // own series[0]/data[0] rather than hardcoding a class -- this exercises
    // the real invariant (hovering a point shows THAT point's whole row)
    // deterministically regardless of grouping order.
    const option = await getChartOption(page) as {
      readonly series?: ReadonlyArray<{ readonly name?: string, readonly data?: ReadonlyArray<ReadonlyArray<number | string>> }>
    } | null
    const targetSeries = option?.series?.[0]
    const targetRow = targetSeries?.data?.[0]
    expect(targetSeries?.name).toBeTruthy()
    expect(targetRow?.length ?? 0).toBeGreaterThan(0)

    // Break the final move into several intermediate mousemove events (as
    // polar-line does): a single-jump teleport onto the ~1px-wide zigzag
    // polyline occasionally lands just off it under full-suite load, so the
    // trigger:'item' tooltip never fires within the 5s budget. Gradual moves
    // cross the line reliably. vertexIndex 1 targets an interior axis vertex
    // (bck-44x: exercises the isPolyline branch reading the exact rendered
    // vertex, not a bounding-rect center that lands between axes).
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0, vertexIndex: 1 }, 10)

    // trigger:'item' shows the series name (the Class) plus every dimension
    // value of the hovered row.
    expect(tooltipText).toContain(targetSeries?.name ?? '')
    for (const value of targetRow ?? []) {
      expect(tooltipText).toContain(String(value))
    }
  })
})
