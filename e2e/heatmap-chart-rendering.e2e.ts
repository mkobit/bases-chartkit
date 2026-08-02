import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

test.describe('heatmap chart rendering', () => {
  // Regression coverage for bck-44j: createHeatmapChartOption uses ECharts'
  // dataset+encode mechanism (encode: { x, y, value, tooltip: [...] }) with no
  // custom tooltip.formatter, so the tooltip is ECharts' default
  // defaultSeriesFormatTooltip -- rendered from the dataset's own column names
  // ('x'/'y'/'value', since no dataset.dimensions override renames them), not
  // a fixed label we can predict with confidence. Assert on the real data
  // VALUES only, not the exact label wording (per bck-44j batch guidance).
  // normalizedData is a direct R.map over the input rows (no sort/group), so
  // Bases' alphabetical-by-filename row order survives into dataIndex order:
  // Server-Load-000.md is { Time: "00:00", Server: "Mon", Load: 2 }.
  test('hovering the first cell shows its time, server, and load in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'heatmap/Basic.base', viewName: 'Server load heatmap' })

    // series[0] uses datasetIndex rather than an inline `data` array, so
    // dataset readiness (not series[0].data) is the real signal here.
    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly dataset?: ReadonlyArray<{ readonly source?: readonly unknown[] }> } | null
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain('00:00')
    expect(tooltipText).toContain('Mon')
    expect(tooltipText).toContain('2')
  })
})
