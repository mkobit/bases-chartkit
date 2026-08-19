import { test, expect } from './fixtures/obsidian'
import { asOptionLike, evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface DatasetLike {
  readonly source?: readonly unknown[]
}

test.describe('bar chart rendering', () => {
  // Regression coverage for bck-0zd: every chart transformer configures a
  // tooltip option, but nothing previously exercised what actually renders
  // on hover -- content, series names, value formatting. This is the
  // exemplar for that pattern: hover the real mouse over a rendered data
  // point (via getItemGraphicEl's bounding box, not dispatchAction --
  // see hoverChartDataPointAndGetTooltip's doc comment) and assert on the
  // tooltip's rendered text.
  // Also regression coverage for bck-i9b.10: createCartesianChartOption
  // originally had no custom tooltip.formatter (axis-trigger default), which
  // for this object-row dataset shape rendered as a bare unlabeled
  // comma-joined list rather than "Department: x" / "Spend: y". cartesian.ts
  // now has a custom formatter labeling the category with xAxisLabel and
  // each series line with its series name (which defaults to yAxisLabel when
  // seriesProp is unset, as here).
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
    }, { path: 'bar/Basic.base', viewName: 'Department spend' })

    await expect.poll(
      async () => page.locator('.bases-echarts canvas').count(),
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Dept-Spend-0.md (the vault's deterministically-generated first note
    // for this chart type) is { Department: "Engineering", Spend: 15005 }.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain('Department: Engineering')
    expect(tooltipText).toContain('Spend: 15,005')
  })

  // Coverage for the FlippedAxis.base variant (bck-aie.1): flipAxis:true is a
  // real structural change, not cosmetic -- cartesian.ts swaps the category
  // and value axes (and each series' encode) so Department runs up the
  // y-axis and Spend along the x-axis, turning the vertical column chart
  // into a horizontal bar chart. Assert the swap landed on the live ECharts
  // option rather than a screenshot, mirroring area-chart-rendering.e2e.ts's
  // identical FlippedAxis.base coverage.
  test('the flipped-axis variant renders the category axis on y and the value axis on x', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'bar/FlippedAxis.base', viewName: 'Department spend (flipped axis)' })

    await expect.poll(
      async () => {
        const option = asOptionLike<{ readonly dataset?: readonly DatasetLike[] }>(await getChartOption(page))
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // getOption() normalizes xAxis/yAxis to arrays. Default (un-flipped) bar
    // puts the Department category on x and Spend value on y; flipAxis
    // inverts both, so this assertion fails if the option ever regressed to
    // default.
    const option = asOptionLike<{
      readonly xAxis?: readonly { readonly type?: string }[]
      readonly yAxis?: readonly { readonly type?: string, readonly data?: readonly unknown[] }[]
    }>(await getChartOption(page))
    expect(option?.xAxis?.[0]?.type).toBe('value')
    expect(option?.yAxis?.[0]?.type).toBe('category')
    expect(option?.yAxis?.[0]?.data?.length ?? 0).toBeGreaterThan(0)
  })

  // Regression coverage for bck-i9b.12: reported as "x axis rotation seems
  // to just move the y axis offset up and down" instead of rotating labels.
  // Investigation found getAxisLabelOverlapOptions already threads rotate
  // into xAxis.axisLabel.rotate correctly (confirmed live: RotatedLabels.base
  // renders visibly tilted category labels) -- this pins that live behavior
  // down as a permanent assertion on the shared cartesian.ts/utils.ts path
  // every other cartesian chart type (line, stacked-bar, heatmap, etc.) uses.
  test('xAxisLabelRotate rotates the category axis labels, not the grid offset', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'bar/RotatedLabels.base', viewName: 'Department spend (rotated labels)' })

    await expect.poll(
      async () => {
        const option = asOptionLike<{ readonly dataset?: readonly DatasetLike[] }>(await getChartOption(page))
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    const option = asOptionLike<{
      readonly xAxis?: readonly { readonly axisLabel?: { readonly rotate?: number } }[]
    }>(await getChartOption(page))
    expect(option?.xAxis?.[0]?.axisLabel?.rotate).toBe(45)
  })
})
