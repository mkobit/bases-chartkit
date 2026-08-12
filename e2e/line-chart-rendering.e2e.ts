import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface DatasetLike {
  readonly source?: readonly unknown[]
}

test.describe('line chart rendering', () => {
  // Regression coverage for bck-44j: line runs through cartesian.ts's shared
  // bar/line path with chartType 'line' -- same single-series, discrete-point
  // shape as bar's own exemplar test (each dataIndex is one drawable symbol
  // marker via SymbolDraw, not a zrender Group), just with a
  // Temporal.PlainDate x-axis property instead of a plain string.
  // Also regression coverage for bck-i9b.10 -- see bar-chart-rendering.e2e.ts's
  // identical comment for the underlying default-tooltip limitation this
  // shared cartesian.ts formatter now fixes.
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
    }, { path: 'line/Basic.base', viewName: 'Revenue trend' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly dataset?: readonly DatasetLike[] } | null
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Revenue-00.md (the vault's deterministically-generated first note for
    // this chart type -- zero-padded since line/ has 24 notes) is
    // { Date: 2023-12-22, Revenue: 242 }. safeToString renders a
    // Temporal.PlainDate Value wrapper as its ISO date string (verified in
    // tests/transformer_utils.test.ts's safeToString spec), matching the raw
    // frontmatter value.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain('Date: 2023-12-22')
    expect(tooltipText).toContain('Revenue: 242')
  })
})
