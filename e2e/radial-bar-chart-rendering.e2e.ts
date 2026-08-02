import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

test.describe('radial-bar chart rendering', () => {
  // Regression coverage for bck-44j, extending the bar hover-tooltip pattern
  // to a polar coordinate system. src/charts/transformers/radial-bar.ts
  // shares the same normalize/dataset/unique-series shape as cartesian.ts
  // (1:1 row->dataIndex mapping, no seriesProp here so a single series named
  // after yAxisLabel), just with coordinateSystem: 'polar' and encode
  // {angle: 'x', radius: 'y'} instead of x/y. Confirmed via
  // node_modules/echarts/lib/chart/bar/BarView.js (`coord.type === 'polar'
  // ? Sector : Rect`) that a polar bar series still renders one discrete
  // Sector shape per dataIndex, not a zrender Group -- the same
  // discrete-shape case as bar, just needing the transform-matrix handling
  // getSeriesItemScreenPosition already applies for polar-nested elements.
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
    }, { path: 'radial-bar/Basic.base', viewName: 'Department spend (radial bar)' })

    await expect.poll(
      async () => page.locator('.bases-echarts canvas').count(),
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Dept-Spend-0.md (the vault's deterministically-generated first note
    // for this chart type) is { Department: "Engineering", Spend: 13482 }.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain('Engineering')
    expect(tooltipText).toContain('Spend')
    expect(tooltipText).toContain('13,482')
  })
})
