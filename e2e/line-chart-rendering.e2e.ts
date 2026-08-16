import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

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
    // this chart type -- zero-padded since line/ has 40 notes) is
    // { Date: 2023-12-22, Revenue: 242 }. safeToString renders a
    // Temporal.PlainDate Value wrapper as its ISO date string (verified in
    // tests/transformer_utils.test.ts's safeToString spec), matching the raw
    // frontmatter value.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain('Date: 2023-12-22')
    expect(tooltipText).toContain('Revenue: 242')
  })

  // Coverage for the Formula.base variant (bck-aie.2 residual + bck-g79): line
  // is the simplest cartesian to prove a `formula.*`-bound x-axis, mirroring
  // area/Formula.base. The x-axis binds `formula.FormattedDate` =
  // Date.format("MMMM DD, YYYY"), so Bases evaluates the formula and the
  // category axis plots the pre-formatted "Month DD, YYYY" string. If the
  // formula id didn't flow through getNestedValue, the categories would render
  // as raw ISO dates or 'Unknown' (cartesian.ts's null/undefined fallback).
  // Category data is a plain string[] on a category axis, read directly off the
  // live option -- no in-page formatter invocation needed.
  test('the formula variant plots Bases-formula-formatted "Month DD, YYYY" dates on the x-axis', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'line/Formula.base', viewName: 'Revenue trend (formatted dates)' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly dataset?: readonly DatasetLike[] } | null
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    await waitForVaultIndexed(page)

    const option = await getChartOption(page) as {
      readonly xAxis?: readonly { readonly type?: string, readonly data?: readonly unknown[] }[]
    } | null
    const categories = option?.xAxis?.[0]?.data ?? []
    expect(categories.length).toBeGreaterThan(0)
    // The daily random walk spans late December 2023 into January 2024, so each
    // formula-computed category is a full month name, zero-padded day, and year.
    for (const category of categories) {
      expect(category).toMatch(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{2}, 20\d{2}$/)
    }
    expect(categories).toContain('December 22, 2023')
  })
})
