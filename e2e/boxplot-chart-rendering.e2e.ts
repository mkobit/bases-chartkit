import { test, expect } from './fixtures/obsidian'
import { asOptionLike, evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface BoxplotSeriesLike {
  readonly type?: string
  readonly itemStyle?: { readonly color?: string }
  readonly data?: ReadonlyArray<ReadonlyArray<string | number>>
}

interface CategoryAxisLike {
  readonly data?: readonly string[]
}

test.describe('boxplot chart rendering', () => {
  // Regression test (bck-gz6.2): ECharts' boxplot defaultOption hardcodes
  // itemStyle.color to an opaque white design token with no dark-theme
  // override, so it rendered as a solid white block against the dark theme's
  // near-black background. The fix sets an explicit transparent fill, which
  // is theme-agnostic -- this only exercises the default (light) e2e
  // profile, but the assertion holds regardless of theme.
  test('boxplot series has a transparent fill, not the ECharts default white', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'boxplot/Basic.base', viewName: 'Product score distribution' })

    await expect.poll(
      async () => {
        const option = asOptionLike<{ readonly series?: readonly unknown[] }>(await getChartOption(page))
        return option?.series?.length ?? 0
      },
      { timeout: 30_000 },
    ).toBeGreaterThan(0)

    const option = asOptionLike<{ readonly series: readonly BoxplotSeriesLike[] }>(await getChartOption(page))
    if (option === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected a non-null chart option')
    }
    const boxplotSeries = option.series.find(s => s.type === 'boxplot')

    expect(boxplotSeries?.itemStyle?.color).toBe('transparent')
  })

  // Regression coverage for bck-44j: boxplot's transformer groups every note
  // sharing a Product value into one box (prepareBoxplotData's computed
  // [min, Q1, median, Q3, max] tuple -- confirmed via
  // node_modules/echarts/extension/dataTool/prepareBoxplotData.js, which
  // pushes exactly that 5-element array with no leading item-name/index --
  // an earlier version of this test wrongly assumed a 6-element
  // [name, ...] shape and skipped index 0, shifting every value and running
  // `max` off the end), so a dataIndex is a whole category's five-number
  // summary, not one note. Rather than hand-computing quantiles from the
  // fixture notes here (duplicating prepareBoxplotData's interpolation logic
  // and risking drift), read the live, already-computed boxData tuple and
  // category name straight from getChartOption() and assert the tooltip
  // reflects those exact figures.
  //
  // Read AFTER hovering, not before: Bases can still be re-rendering (a
  // later setOption call landing as indexing catches up) even once the
  // readiness poll below finds a non-empty series, and a live run showed
  // that capturing "expected" values first -- even after waitForVaultIndexed
  // -- can still race a final settling render that lands microtasks later.
  // hoverChartDataPointAndGetTooltip's own internal position-stability poll
  // is the strongest available settling signal, so reading the comparison
  // values immediately after it resolves (rather than before starting the
  // hover) guarantees they describe the exact same render the tooltip came
  // from.
  test('hovering a product\'s box shows its five-number summary in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'boxplot/Basic.base', viewName: 'Product score distribution' })

    await expect.poll(
      async () => {
        const option = asOptionLike<{ readonly series?: readonly BoxplotSeriesLike[] }>(await getChartOption(page))
        const boxplotSeries = option?.series?.find(s => s.type === 'boxplot')
        return boxplotSeries?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    await waitForVaultIndexed(page)

    const seriesOption = asOptionLike<{ readonly series: readonly BoxplotSeriesLike[] }>(await getChartOption(page))
    if (seriesOption === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected a non-null chart option')
    }
    const seriesIndex = seriesOption.series.findIndex(s => s.type === 'boxplot')
    const dataIndex = 0

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex, dataIndex })

    const option = asOptionLike<{
      readonly series: readonly BoxplotSeriesLike[]
      readonly xAxis: CategoryAxisLike | readonly CategoryAxisLike[]
    }>(await getChartOption(page))
    if (option === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected a non-null chart option')
    }
    const boxplotSeries = option.series[seriesIndex]
    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis

    const categoryName = xAxis?.data?.[dataIndex]
    const boxTuple = boxplotSeries?.data?.[dataIndex]
    if (!categoryName || !boxTuple) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected a resolved category name and boxData tuple at dataIndex 0')
    }
    const [min, q1, median, q3, max] = boxTuple

    expect(tooltipText).toContain(categoryName)
    expect(tooltipText).toContain('min')
    expect(tooltipText).toContain(String(min))
    expect(tooltipText).toContain('Q1')
    expect(tooltipText).toContain(String(q1))
    expect(tooltipText).toContain('median')
    expect(tooltipText).toContain(String(median))
    expect(tooltipText).toContain('Q3')
    expect(tooltipText).toContain(String(q3))
    expect(tooltipText).toContain('max')
    expect(tooltipText).toContain(String(max))
  })
})
