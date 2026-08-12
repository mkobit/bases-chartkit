import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface DatasetLike {
  readonly source?: readonly unknown[]
}

test.describe('area chart rendering', () => {
  // Regression coverage for bck-44j: area-chart is a pure rendering variant
  // of line-chart -- cartesian.ts's 'line' path with areaStyle:{} forced on
  // (see src/views/area-chart-view.ts) -- so its hover/tooltip behavior is
  // identical to line's own test. Uses its own notes directory
  // (notePrefix 'Area-Revenue', distinct from line's 'Revenue') even though
  // the data shape is the same.
  test('hovering the first point shows its date, series name, and value in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'area/Basic.base', viewName: 'Sales area chart' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly dataset?: readonly DatasetLike[] } | null
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Area-Revenue-00.md (the vault's deterministically-generated first note
    // for this chart type -- zero-padded since area/ has 22 notes) is
    // { Date: 2023-12-25, Revenue: 106 }. safeToString renders a
    // Temporal.PlainDate Value wrapper as its ISO date string (verified in
    // tests/transformer_utils.test.ts's safeToString spec), matching the raw
    // frontmatter value.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain('2023-12-25')
    expect(tooltipText).toContain('Revenue')
    expect(tooltipText).toContain('106')
  })
})
