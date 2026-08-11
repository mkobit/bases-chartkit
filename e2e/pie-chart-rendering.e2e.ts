import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

test.describe('pie chart rendering', () => {
  // Regression coverage for bck-44j, extending the bar/radar hover-tooltip
  // pattern to pie's discrete sector shapes. src/charts/transformers/pie.ts
  // groups rows by name before rendering, but Sales-Region's three notes all
  // have distinct Region values, so grouping is a no-op and the alphabetical
  // note-filename order (Sales-Region-0.md first, same convention as
  // bar/radar) survives into dataIndex order.
  test('hovering the first slice shows its region name and value in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'pie/Basic.base', viewName: 'Sales by region (pie)' })

    await expect.poll(
      async () => page.locator('.bases-echarts canvas').count(),
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Sales-Region-0.md is { Region: "Search Engine", Revenue: 100 }. pie.ts
    // uses a custom tooltip formatter (bck-i9b.8: the default formatter-less
    // tooltip can't label multi-dim object-row values -- see scatter.ts's
    // comment on the same underlying ECharts limitation -- and pie's raw
    // value alone doesn't convey share-of-whole), so the tooltip is
    // "name: value (percent%)" with no separate series-name header line.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain('Search Engine')
    expect(tooltipText).toContain('3,227')
    expect(tooltipText).toMatch(/\(\d+(\.\d+)?%\)/)
  })
})
