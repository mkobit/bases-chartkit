import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, getSeriesVisualValues, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface EffectScatterSeriesLike {
  readonly name?: string
}

interface EffectScatterRow {
  readonly x: string
  readonly y: number | null
  readonly s: string
}

interface DatasetLike {
  readonly source?: readonly EffectScatterRow[]
}

test.describe('effect-scatter chart rendering', () => {
  // Regression coverage for bck-44j: targets ONLY the safe Basic.base variant
  // (no sizeProp bound). Sized-By-Population.base below is an intentionally-
  // broken fixture for the bck-ma9 regression test -- do not point a hover
  // test at it.
  //
  // effect-scatter.ts groups rows into one series per seriesProp value
  // (Continent) via the same filter-transform dataset as scatter.ts. A live
  // run showed which continent actually lands at series 0 does NOT match a
  // hand-read of the first note file (observed "North America" here, not the
  // assumed "Asia") -- Bases' resolved row order isn't safely predictable
  // from a static file read, same lesson as stacked-bar/polar-line. Read
  // series[0]'s resolved name and dataset[0]'s first matching row live
  // instead, mirroring stacked-bar-chart-rendering.e2e.ts's exemplar pattern.
  //
  // EffectScatterView draws each item as an EffectSymbol -- a zrender Group
  // wrapping the real Symbol (childAt(0)) plus a ripple-animation group
  // (childAt(1)), confirmed via
  // node_modules/echarts/lib/chart/helper/EffectSymbol.js. Both children are
  // centered on the same data point, so hoverChartDataPointAndGetTooltip's
  // smallest-leaf heuristic lands on a screen position that's correct either
  // way -- no radar-style vertex-picking risk here.
  // Fixed for bck-44x: live runs intermittently read back a resolved
  // series[0].name that didn't match what was actually hovered -- turned out
  // to be a fixture bug, not an ECharts option/model disagreement.
  // effect-scatter's x-axis is `type: 'category'`, and
  // scripts/generators/scatter.ts's fast-check arbitrary disproportionately
  // re-sampled boundary values (`x`'s own `min: 10`), so several rows across
  // DIFFERENT continents landed on the exact same `x` category. Their
  // symbols then painted on/near the same screen position, and a real mouse
  // hover could land on whichever series' symbol was on top -- not
  // necessarily seriesIndex 0's own point. Fixed by deduplicating the
  // generated data by `x` alone (see scatter.ts), which every consumer of
  // that arbitrary (scatter/effect-scatter/polar-scatter) shares.
  test('hovering the first point shows its continent and coordinates in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'effect-scatter/basic/Basic.base', viewName: 'GDP vs life expectancy (effect scatter)' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly dataset?: readonly DatasetLike[] } | null
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Bases can still be re-rendering (a later setOption call landing as
    // indexing catches up) even after the poll above finds a non-empty
    // dataset -- wait for full indexing first so this read and
    // hoverChartDataPointAndGetTooltip's own internal wait observe the same,
    // final state.
    await waitForVaultIndexed(page)

    // Read AFTER hovering, not before: a live run showed this test flaky
    // under the "read then hover" ordering even with waitForVaultIndexed in
    // place. hoverChartDataPointAndGetTooltip's own internal
    // position-stability poll is the strongest available settling signal --
    // reading the comparison values immediately after it resolves guarantees
    // they describe the exact same render the tooltip came from. seriesIndex
    // 0 and dataIndex 0 are fixed/known ahead of time, so this doesn't need
    // the resolved continent name/row to start the hover.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    const option = await getChartOption(page) as {
      readonly series: readonly EffectScatterSeriesLike[]
      readonly dataset: readonly DatasetLike[]
    }
    const continent = option.series[0]?.name
    if (typeof continent !== 'string') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected effect-scatter series[0] to have a resolved continent name')
    }

    const sourceRows = option.dataset[0]?.source ?? []
    const firstContinentRow = sourceRows.find(row => row.s === continent)
    if (!firstContinentRow || firstContinentRow.y === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected at least one dataset row for continent ${continent}`)
    }

    expect(tooltipText).toContain(continent)
    expect(tooltipText).toContain(firstContinentRow.x)
    expect(tooltipText).toContain(firstContinentRow.y.toLocaleString('en-US'))
  })
  // Regression test: sizeProp must be normalized into a bounded pixel range
  // (matching scatter.ts's visualMap-based approach), not used directly as a
  // raw symbolSize. Real-world magnitudes (country population, in the
  // millions here) would otherwise draw a circle large enough to cover the
  // whole canvas.
  test('normalizes sizeProp into a bounded symbol size, not raw data magnitude', async ({ obsidianPage: { page } }) => {
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
    // symbolSize it drives) arrives after the first paint. effect-scatter/
    // sorts alphabetically after calendar/ (365 notes), so it's at risk of
    // the same cold-start indexing delay as radar/ and map/.
    await expect.poll(
      async () => (await getSeriesVisualValues(page, { seriesIndex: 0, visualKey: 'symbolSize' })).length,
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
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
