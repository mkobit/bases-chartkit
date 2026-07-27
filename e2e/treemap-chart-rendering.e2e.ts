import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption } from './helpers/evaluate'

interface TreemapSeriesLike {
  readonly type?: string
  readonly itemStyle?: { readonly borderColor?: string }
}

test.describe('treemap chart rendering', () => {
  // Regression test (bck-1v4): TreemapChartView.getChartOption used to pass a
  // literal {} instead of getCommonTransformerOptions(), silently dropping
  // every common option before it ever reached the transformer. Note ECharts'
  // getOption() doesn't echo treemap's `data` back (it's converted into an
  // internal tree), so this asserts on a field that does survive round-trip
  // to prove the view->transformer pipeline still renders successfully with
  // real options flowing through instead of {}.
  test('treemap renders with real common options flowing through', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'treemap/Basic.base', viewName: 'Project tasks treemap' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly series?: readonly unknown[] } | null
        return option?.series?.length ?? 0
      },
      { timeout: 30_000 },
    ).toBeGreaterThan(0)

    const option = await getChartOption(page) as { readonly series: readonly TreemapSeriesLike[] }
    const treemapSeries = option.series.find(s => s.type === 'treemap')

    expect(treemapSeries?.itemStyle?.borderColor).toBe('transparent')
  })
})
