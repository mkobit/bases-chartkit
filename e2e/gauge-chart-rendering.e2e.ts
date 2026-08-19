import { test, expect } from './fixtures/obsidian'
import { asOptionLike, evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface GaugeDataPointLike {
  readonly name: string
  readonly value: number
}

test.describe('gauge chart rendering', () => {
  // Regression coverage for bck-44j. src/charts/transformers/gauge.ts's
  // createGaugeChartOption collapses every Server-Load note into exactly one
  // aggregated data point (aggregation: 'avg', per gauge/Basic.base) -- there
  // is no per-note dataIndex to predict from a specific note file, so read
  // the live, already-aggregated value back out of getChartOption() rather
  // than recomputing the average from the vault's notes by hand. gauge.ts's
  // registered graphic element (GaugeView.js's `pointer`, a single Path, not
  // a zrender Group) is a discrete leaf shape like bar's, not a
  // multi-element shape like radar's.
  test('hovering the gauge needle shows its label and aggregated value in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'gauge/Basic.base', viewName: 'Server load gauge (average)' })

    await expect.poll(
      async () => {
        const option = asOptionLike<{ readonly series?: ReadonlyArray<{ readonly data?: readonly unknown[] }> }>(await getChartOption(page))
        return option?.series?.[0]?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    const option = asOptionLike<{ readonly series: ReadonlyArray<{ readonly data: readonly GaugeDataPointLike[] }> }>(await getChartOption(page))
    if (option === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected a non-null chart option')
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- verified with `tsc --noEmit` directly: removing this produces TS2532 'Object is possibly undefined' under noUncheckedIndexedAccess. The lint rule's own type analysis disagrees with tsc here.
    const gaugeSeries = option.series[0]!
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- see above.
    const point = gaugeSeries.data[0]!

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    // gauge/Basic.base declares a "Load" display name for note.Load, which
    // gauge-chart-view.ts resolves via getPropDisplayName and passes through
    // as options.yAxisLabel -> the data point's `name`. The transformer's
    // tooltip formatter is the literal '{a} <br/>{b} : {c}' template; {a}
    // (series name) is blank since the gauge series itself sets no `name`,
    // so only the point's own name/value show up.
    expect(tooltipText).toContain(point.name)
    expect(tooltipText).toContain(String(point.value))
  })
})
