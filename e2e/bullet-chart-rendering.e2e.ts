import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption } from './helpers/evaluate'

interface BulletSeriesLike {
  readonly type?: string
  readonly stack?: string
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
        const option = await getChartOption(page) as { readonly series?: readonly unknown[] } | null
        return option?.series?.length ?? 0
      },
      { timeout: 30_000 },
    ).toBeGreaterThan(0)

    const option = await getChartOption(page) as { readonly series: readonly BulletSeriesLike[] }
    const rangeSeries = option.series.filter(s => s.type === 'bar' && s.stack === 'range')
    const targetSeries = option.series.find(s => s.type === 'scatter')

    expect(rangeSeries.map(s => s.itemStyle?.color)).toEqual(['#e0e0e0', '#bdbdbd', '#9e9e9e'])
    expect(targetSeries?.itemStyle?.color).toBe('#000')
  })
})
