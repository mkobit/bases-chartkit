import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption } from './helpers/evaluate'

test.describe('chart rendering', () => {
  test('opens a .base file and mounts an echarts canvas', async ({ obsidianPage: { page } }) => {
    // Open Sales-Dashboard.base on its "Sales bar chart" view. Wait for the
    // workspace layout so getLeaf has a tab group to attach to. Specify viewName
    // so the chart subview is the active one (without it the leaf may settle on
    // a non-rendering default view).
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
    }, { path: 'Sales-Dashboard.base', viewName: 'Sales bar chart' })

    // Canvas presence in the DOM is the regression signal: it proves the chart
    // view's onload() ran cleanly (addAction-style bugs would throw and skip
    // the mount) and renderChart reached the ECharts init.
    await expect.poll(
      async () => page.locator('.bases-echarts canvas').count(),
      { timeout: 30_000 },
    ).toBeGreaterThan(0)
  })

  test('retrieves live ECharts option via getChartOption helper', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'Sales-Dashboard.base', viewName: 'Sales bar chart' })

    // Wait for the chart to render and for its series to be populated.
    await expect.poll(
      async () => {
        const opt = await getChartOption(page) as { readonly series?: ReadonlyArray<{ readonly type: string }> } | null
        return opt?.series?.length ?? 0
      },
      { timeout: 30_000 },
    ).toBeGreaterThan(0)

    // Verify the options.
    const option = await getChartOption(page) as { readonly series: ReadonlyArray<{ readonly type: string }> } | null
    expect(option).not.toBeNull()
    expect(option?.series?.[0]?.type).toBe('bar')
  })
})
