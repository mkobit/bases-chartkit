import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption } from './helpers/evaluate'

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

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly series?: readonly unknown[] } | null
        return option?.series?.length ?? 0
      },
      { timeout: 30_000 },
    ).toBeGreaterThan(0)

    const option = await getChartOption(page) as { readonly legend?: LegendOptionLike | readonly LegendOptionLike[] }
    const legend = Array.isArray(option.legend) ? option.legend[0] : option.legend

    // rose/Basic.base sets legendPosition: right -- getLegendOption maps that
    // to { right: 0, top: 'middle', orient: 'vertical' }. The pre-fix default
    // (legendPosition silently dropped) would instead produce the top
    // position's { top: 0, left: 'center', orient: 'horizontal' }.
    expect(legend?.orient).toBe('vertical')
    expect(legend?.right).toBe(0)
  })
})
