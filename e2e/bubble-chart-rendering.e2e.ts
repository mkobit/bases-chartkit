import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

test.describe('bubble chart rendering', () => {
  // Regression coverage for bck-44j: bubble reuses scatter.ts's transformer
  // with no seriesProp bound, so every row lands in a single, unfiltered
  // series -- a direct 1:1 row-to-dataIndex mapping like bar's, unlike
  // scatter/effect-scatter/polar-scatter's seriesProp-grouped siblings.
  test('hovering the first point shows its series name and coordinates in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'bubble/Basic.base', viewName: 'Weighted point cloud (bubble)' })

    await expect.poll(
      async () => page.locator('.bases-echarts canvas').count(),
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Point-00.md (the vault's deterministically-generated first note for
    // this chart type) is { PointX: 78, PointY: 0, Weight: 46 }. With no
    // seriesProp bound, scatter.ts names the single series after yAxisLabel
    // -- the Bases-configured display name for note.PointY, "Point Y" (see
    // bubble/Basic.base's properties block).
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    // Regression coverage for bck-i9b.8: see scatter-chart-rendering.e2e.ts's
    // identical comment -- scatter.ts's custom formatter (shared by bubble)
    // labels each value with its axis/size name instead of ECharts' default
    // bare, unlabeled comma-joined list.
    expect(tooltipText).toContain('Point Y')
    expect(tooltipText).toContain('Point X: 37')
    expect(tooltipText).toContain('Point Y: 5')
    expect(tooltipText).toContain('Weight: 75')
  })
})
