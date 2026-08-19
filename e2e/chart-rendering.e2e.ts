import { test, expect } from './fixtures/obsidian'
import { asOptionLike, evaluateObsidian, getChartOption, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

test.describe('chart rendering', () => {
  test('opens a .base file and mounts an echarts canvas', async ({ obsidianPage: { page } }) => {
    // Open bar/Basic.base on its "Department spend" view. Wait for the
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
    }, { path: 'bar/Basic.base', viewName: 'Department spend' })

    // Canvas presence in the DOM is the regression signal: it proves the chart
    // view's onload() ran cleanly (addAction-style bugs would throw and skip
    // the mount) and renderChart reached the ECharts init. bar/ sorts
    // alphabetically before the large chart-type directories (calendar,
    // heatmap, theme-river) so this is low-risk today, but a cold Obsidian
    // profile's vault indexing time is shared across every test, so this uses
    // the same generous timeout as the rest of the suite.
    await expect.poll(
      async () => page.locator('.bases-echarts canvas').count(),
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
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
    }, { path: 'bar/Basic.base', viewName: 'Department spend' })

    // Wait for the chart to render and for its series to be populated.
    await expect.poll(
      async () => {
        const opt = asOptionLike<{ readonly series?: ReadonlyArray<{ readonly type: string }> }>(await getChartOption(page))
        return opt?.series?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Verify the options.
    const option = asOptionLike<{ readonly series: ReadonlyArray<{ readonly type: string }> }>(await getChartOption(page))
    expect(option).not.toBeNull()
    expect(option?.series?.[0]?.type).toBe('bar')
  })
})
