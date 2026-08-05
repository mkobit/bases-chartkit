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

    // Character-0.md (the vault's deterministically-generated first note for
    // this chart type) is
    // { Name: "Gandalf", Class: "Wizard", Strength: 4, Intelligence: 3, Agility: 8 }.
    // seriesProp groups by Class, and Gandalf is the only Wizard, so his row
    // is series 0's only data point.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0, vertexIndex: 1 })

    expect(tooltipText).toContain('Wizard')
    expect(tooltipText).toContain('4')
    expect(tooltipText).toContain('3')
    expect(tooltipText).toContain('8')
  })
})
