import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

test.describe('pictorial-bar chart rendering', () => {
  // Regression coverage for bck-44j, extending the bar hover-tooltip pattern
  // to pictorialBar. src/charts/transformers/pictorial-bar.ts shares
  // cartesian.ts's dataset/encode shape (same axis-trigger tooltip, same
  // 1:1 row->dataIndex mapping), so this mirrors bar's test directly --
  // though pictorial-bar.ts now has its own custom tooltip formatter (see
  // the bck-i9b.8 comment below), which cartesian.ts does not. Unlike bar's
  // plain Rect bars, PictorialBarView.js renders each
  // dataIndex as a zrender Group (a __pictorialBundle of repeated symbol
  // paths plus a silent, invisible __pictorialBarRect used only for label
  // placement) -- confirmed by reading PictorialBarView.js directly, the
  // same way the radar work read RadarView.js. hoverChartDataPointAndGetTooltip's
  // smallest-leaf-shape heuristic already handles this: the invisible full-bar
  // Rect is a much larger leaf than any individual repeated symbol tile, so it
  // loses the smallest-area tie-break and a real, hit-testable pictogram tile
  // gets hovered instead.
  test('hovering the first bar shows its category, series name, and value in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'pictorial-bar/Basic.base', viewName: 'Department spend (pictorial bar)' })

    await expect.poll(
      async () => page.locator('.bases-echarts canvas').count(),
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Dept-Spend-0.md (the vault's deterministically-generated first note
    // for this chart type) is { Department: "Engineering", Spend: 61961 }.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    // Regression coverage for bck-i9b.8: pictorial-bar.ts's default
    // (formatter-less) axis-trigger tooltip hit the same object-row labeling
    // gap as scatter.ts (see its identical comment) -- confirmed live before
    // this fix, hovering showed a bare "Sales140,022" with no indication
    // "140,022" was Spend. A custom formatter now labels the value with the
    // series name (here the yAxisLabel fallback "Spend", since this fixture
    // has no seriesProp).
    expect(tooltipText).toContain('Sales')
    expect(tooltipText).toContain('Spend: 140,022')
  })
})
