import { test, expect } from './fixtures/obsidian'
import { asOptionLike, evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

test.describe('heatmap chart rendering', () => {
  // Regression coverage for bck-44j (dataset/encode wiring) and bck-i9b.10
  // (tooltip clarity). createHeatmapChartOption originally had no custom
  // tooltip.formatter, so hovering showed ECharts' default tooltip -- which,
  // like every other object-row-dataset transformer fixed this session (see
  // scatter-chart-rendering.e2e.ts's bck-i9b.8 comment for the underlying
  // ECharts limitation), rendered as a bare unlabeled comma-joined list, not
  // "Time: x / Server: y / Load: value". heatmap.ts now has a custom
  // formatter labeling each value with its axis/value name.
  // normalizedData is a direct R.map over the input rows (no sort/group), so
  // Bases' alphabetical-by-filename row order survives into dataIndex order:
  // Server-Load-000.md is { Time: "00:00", Server: "Mon", Load: 1 }.
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
        const option = asOptionLike<{ readonly dataset?: ReadonlyArray<{ readonly source?: readonly unknown[] }> }>(await getChartOption(page))
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain('Time: 00:00')
    expect(tooltipText).toContain('Server: Mon')
    expect(tooltipText).toContain('Load: 1')
  })

  // Regression coverage for bck-aie.26 (feedback: "better heatmap coloring",
  // "numbers are a bit confusing", "x axis of time could be a bit better").
  // Asserts the enrichment end-to-end off the live option: the default ramp is
  // the sequential blue (light->dark, not the old rainbow), cell labels carry a
  // legibility halo, and the 24 hourly x categories get thinned + rotated.
  test('renders a sequential blue ramp, haloed cell labels, and a thinned time axis', async ({ obsidianPage: { page } }) => {
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

    await expect.poll(
      async () => {
        const option = asOptionLike<{ readonly dataset?: ReadonlyArray<{ readonly source?: readonly unknown[] }> }>(await getChartOption(page))
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // ECharts' live getOption() normalizes every component to an array (same
    // reason the area formula test reads xAxis[0]), so index into each.
    const option = asOptionLike<{
      readonly visualMap?: ReadonlyArray<{ readonly inRange?: { readonly color?: readonly string[] } }>
      readonly series?: ReadonlyArray<{ readonly label?: { readonly textBorderColor?: string, readonly textBorderWidth?: number } }>
      readonly xAxis?: ReadonlyArray<{ readonly data?: readonly unknown[], readonly axisLabel?: { readonly interval?: unknown, readonly rotate?: number } }>
    }>(await getChartOption(page))

    const ramp = option?.visualMap?.[0]?.inRange?.color ?? []
    // Sequential: light low end, dark high end (guards against a rainbow revert).
    expect(ramp[0]).toBe('#cde2fb')
    expect(ramp.at(-1)).toBe('#0d366b')

    const label = option?.series?.[0]?.label
    expect(label?.textBorderColor).toBe('rgba(255, 255, 255, 0.85)')
    expect(label?.textBorderWidth).toBe(2)

    // 24 hourly categories exceed the thinning threshold, so ECharts thins the
    // x labels (interval:'auto') to prevent collision. Rotation is the separate
    // cross-cutting bck-i9b.12 concern (and is view-gated to 0), out of scope here.
    expect((option?.xAxis?.[0]?.data ?? []).length).toBe(24)
    expect(option?.xAxis?.[0]?.axisLabel?.interval).toBe('auto')
  })
})
