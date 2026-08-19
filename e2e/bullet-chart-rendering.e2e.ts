import { test, expect } from './fixtures/obsidian'
import { asOptionLike, evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface BulletSeriesLike {
  readonly type?: string
  readonly stack?: string
  readonly name?: string
  readonly itemStyle?: { readonly color?: string }
}

test.describe('bullet chart rendering', () => {
  // Regression test (bck-gz6.1): range-band and target-marker colors must be
  // theme-aware, not hardcoded light-mode hex. This only exercises the
  // default (light) e2e profile -- dark-mode parametrization is tracked
  // separately (bck-frm) -- but locks in that the light-mode palette still
  // renders correctly with the isDarkMode plumbing wired through.
  test('renders light-mode range bands and a black target marker by default', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'bullet/Basic.base', viewName: 'KPI bullet chart' })

    await expect.poll(
      async () => {
        const option = asOptionLike<{ readonly series?: readonly unknown[] }>(await getChartOption(page))
        return option?.series?.length ?? 0
      },
      { timeout: 30_000 },
    ).toBeGreaterThan(0)

    const option = asOptionLike<{ readonly series: readonly BulletSeriesLike[] }>(await getChartOption(page))
    if (option === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected a non-null chart option')
    }
    const rangeSeries = option.series.filter(s => s.type === 'bar' && s.stack === 'range')
    const targetSeries = option.series.find(s => s.type === 'scatter')

    expect(rangeSeries.map(s => s.itemStyle?.color)).toEqual(['#e0e0e0', '#bdbdbd', '#9e9e9e'])
    expect(targetSeries?.itemStyle?.color).toBe('#000')
  })

  // Regression coverage for bck-44j. bullet.ts renders five series for this
  // view (3 stacked, silent, tooltip-suppressed range-band bars, then the
  // KPI's own "value" bar, then a "Target" scatter marker) -- the value bar
  // is the one a user actually wants to hover, but its seriesIndex depends
  // on hasRanges/targetProp being configured, so find it structurally
  // (type: 'bar' with no 'range' stack) instead of assuming a fixed index.
  test('hovering the first KPI\'s value bar shows its metric and value in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'bullet/Basic.base', viewName: 'KPI bullet chart' })

    await expect.poll(
      async () => {
        const option = asOptionLike<{ readonly series?: readonly unknown[] }>(await getChartOption(page))
        return option?.series?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    const option = asOptionLike<{ readonly series: readonly BulletSeriesLike[] }>(await getChartOption(page))
    if (option === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected a non-null chart option')
    }
    const valueSeriesIndex = option.series.findIndex(s => s.type === 'bar' && s.stack !== 'range')
    expect(valueSeriesIndex).toBeGreaterThanOrEqual(0)

    // KPI-0.md (the vault's deterministically-generated first note for this
    // chart type) is { Metric: "Revenue Growth", Value: 170, ... }. The value
    // bar's dataset row order matches note-file order directly -- unlike
    // funnel/pie, bullet.ts's dataset is neither grouped nor sorted.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: valueSeriesIndex, dataIndex: 0 })

    expect(tooltipText).toContain('Revenue Growth')
    expect(tooltipText).toContain('Value')
    expect(tooltipText).toContain('170')
  })
})
