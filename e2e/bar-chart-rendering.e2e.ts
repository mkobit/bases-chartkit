import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

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
})
