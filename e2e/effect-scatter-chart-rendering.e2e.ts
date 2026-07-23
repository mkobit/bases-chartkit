import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getSeriesVisualValues } from './helpers/evaluate'

test.describe('effect-scatter chart rendering', () => {
  // Regression test for obsidian-bases-charts-ma9: sizeProp must be normalized
  // into a bounded pixel range (matching scatter.ts's visualMap-based
  // approach), not used directly as a raw symbolSize. Real-world magnitudes
  // (country population, in the millions here) would otherwise draw a circle
  // large enough to cover the whole canvas.
  test('normalizes sizeProp into a bounded symbol size, not raw data magnitude', async ({ obsidianPage: { page } }) => {
    // ma9 is still open: symbolSize currently passes sizeProp's raw magnitude
    // straight through as pixel size. Remove this once the transformer
    // normalizes it (see scatter.ts's visualMap approach) -- Playwright fails
    // the run if this test unexpectedly starts passing, which is the signal
    // to remove the annotation.
    test.fail()

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
    }, { path: 'effect-scatter/sized-by-population/Sized-By-Population.base', viewName: 'GDP vs life expectancy sized by population' })

    // Wait for the effect-scatter series to have resolved item visuals --
    // Bases resolves its query asynchronously, so population data (and the
    // symbolSize it drives) arrives after the first paint.
    await expect.poll(
      async () => (await getSeriesVisualValues(page, { seriesIndex: 0, visualKey: 'symbolSize' })).length,
      { timeout: 30_000 },
    ).toBeGreaterThan(0)

    // These are the *actually rendered* pixel sizes ECharts computed for each
    // point, read from the live instance's visual-encoding model -- not the
    // static option object the transformer produced. Country populations here
    // range from ~7M to ~61M; unnormalized, that's the raw symbolSize in px.
    const symbolSizes = await getSeriesVisualValues(page, { seriesIndex: 0, visualKey: 'symbolSize' }) as readonly number[]

    expect(symbolSizes.length).toBeGreaterThan(0)
    for (const size of symbolSizes) {
      expect(size).toBeGreaterThan(0)
      expect(size).toBeLessThanOrEqual(100)
    }
  })
})
