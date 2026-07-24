import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption } from './helpers/evaluate'

interface BoxplotSeriesLike {
  readonly type?: string
  readonly itemStyle?: { readonly color?: string }
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
        const option = await getChartOption(page) as { readonly series?: readonly unknown[] } | null
        return option?.series?.length ?? 0
      },
      { timeout: 30_000 },
    ).toBeGreaterThan(0)

    const option = await getChartOption(page) as { readonly series: readonly BoxplotSeriesLike[] }
    const boxplotSeries = option.series.find(s => s.type === 'boxplot')

    expect(boxplotSeries?.itemStyle?.color).toBe('transparent')
  })
})
