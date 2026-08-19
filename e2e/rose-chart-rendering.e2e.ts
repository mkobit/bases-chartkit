import { test, expect } from './fixtures/obsidian'
import { asOptionLike, evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface LegendOptionLike {
  readonly orient?: string
  readonly right?: number | string
  readonly top?: number | string
}

test.describe('rose chart rendering', () => {
  // Regression test (bck-bjg): RoseChartView built transformer options as a
  // hand-rolled { legend: showLegend }, bypassing getCommonTransformerOptions()
  // and silently dropping legendPosition/legendOrient (and other common
  // options). The view's fix now spreads getCommonTransformerOptions() like
  // every other chart view -- this locks in that a configured legendPosition
  // actually reaches the rendered legend instead of always falling back to
  // the default top position.
  test('respects a configured legendPosition instead of falling back to the default', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'rose/Basic.base', viewName: 'Department spend (rose)' })

    // rose/ sorts alphabetically after calendar/ and heatmap/ (both
    // large-volume directories), so it carries the same cold-start indexing
    // risk as radar/ and map/.
    await expect.poll(
      async () => {
        const option = asOptionLike<{ readonly series?: readonly unknown[] }>(await getChartOption(page))
        return option?.series?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    const option = asOptionLike<{ readonly legend?: LegendOptionLike | readonly LegendOptionLike[] }>(await getChartOption(page))
    if (option === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected a non-null chart option')
    }
    const legend = Array.isArray(option.legend) ? option.legend[0] : option.legend

    // rose/Basic.base sets legendPosition: right -- getLegendOption maps that
    // to { right: 0, top: 'middle', orient: 'vertical' }. The pre-fix default
    // (legendPosition silently dropped) would instead produce the top
    // position's { top: 0, left: 'center', orient: 'horizontal' }.
    expect(legend?.orient).toBe('vertical')
    expect(legend?.right).toBe(0)
  })

  // Regression coverage for bck-44j, extending the bar/pie hover-tooltip
  // pattern to rose. transformer.ts's 'rose' entry is createPieChartOption
  // with roseType: 'area' -- the same Sector-per-dataIndex shape and 'item'
  // trigger as pie (confirmed via node_modules/echarts/lib/chart/pie/PieView.js,
  // `new graphic.Sector(...)`), and pie.ts groups rows by name before
  // rendering, but Dept-Spend's departments are all distinct here, so
  // grouping is a no-op and the alphabetical note-filename order survives
  // into dataIndex order, same as pie's own test. pie.ts sets no series
  // `name`, so (per pie's test) the tooltip shows only the slice's own
  // name/value, no series-name header. Extended for bck-i9b.8: rose's angle
  // (roseType: 'area' keeps angle constant) vs. radius encoding makes the
  // raw value alone ambiguous, so pie.ts's custom formatter (shared with
  // pie) appends a percent-of-total.
  test('hovering the first slice shows its department and spend in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'rose/Basic.base', viewName: 'Department spend (rose)' })

    await expect.poll(
      async () => page.locator('.bases-echarts canvas').count(),
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Dept-Spend-0.md (the vault's deterministically-generated first note
    // for this chart type) is { Department: "Engineering", Spend: 15017 }.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain('Engineering')
    expect(tooltipText).toContain('15,017')
    expect(tooltipText).toMatch(/\(\d+(\.\d+)?%\)/)
  })
})
