import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface PolarScatterSeriesLike {
  readonly name?: string
}

interface PolarScatterRow {
  readonly x: string
  readonly y: number | null
  readonly s: string
  readonly size?: number
}

interface DatasetLike {
  readonly source?: readonly PolarScatterRow[]
}

test.describe('polar-scatter chart rendering', () => {
  // Regression coverage for bck-44j: polar-scatter.ts shares scatter.ts's
  // seriesProp-grouped filter-transform dataset, plus a sizeProp normalized
  // via visualMap and a polar coordinate system. A live run showed which
  // continent actually lands at series 0 does NOT match a hand-read of the
  // first note file (observed "Africa" here, not the assumed "North
  // America") -- Bases' resolved row order isn't safely predictable from a
  // static file read, same lesson as stacked-bar/polar-line/effect-scatter.
  // Read series[0]'s resolved name and dataset[0]'s first matching row live
  // instead, mirroring stacked-bar-chart-rendering.e2e.ts's exemplar pattern.
  // Read AFTER hovering, not before: a live run showed that capturing the
  // resolved series name/row before hovering -- even after
  // waitForVaultIndexed -- can still race a final settling render that lands
  // microtasks later. hoverChartDataPointAndGetTooltip's own internal
  // position-stability poll is the strongest available settling signal, so
  // reading the comparison values immediately after it resolves guarantees
  // they describe the exact same render the tooltip came from. seriesIndex 0
  // and dataIndex 0 are fixed/known ahead of time, so this doesn't need the
  // resolved name/row to start the hover.
  //
  // Despite the polar coordinate system,
  // node_modules/echarts/lib/chart/scatter/ScatterView.js's render() uses
  // the same coordinate-system-agnostic SymbolDraw as cartesian
  // scatter/bubble -- each dataIndex is still one discrete Symbol shape, not
  // a zrender Group like radar's per-vertex shapes -- so no radar-style
  // leaf-shape traversal quirk here, and the existing
  // getSeriesItemScreenPosition/hoverChartDataPointAndGetTooltip helpers work
  // unmodified.
  // Fixed for bck-44x: live runs intermittently read back a resolved
  // series[0].name that didn't match what was actually hovered. Root cause
  // was a fixture bug, not an ECharts option/model disagreement: this
  // chart's angle axis is `type: 'category'` on `x`, and
  // scripts/generators/scatter.ts's fast-check arbitrary disproportionately
  // re-sampled boundary values (`x`'s own `min: 10`), so several rows across
  // DIFFERENT continents shared the exact same `x` category -- landing on
  // the identical angle. Their symbols could then visually overlap even at
  // different radii once sizeProp-driven symbol sizing was applied, so a
  // real mouse hover could land on whichever series' symbol was on top, not
  // necessarily seriesIndex 0's own point. Fixed by deduplicating the
  // generated data by `x` alone (see scatter.ts), which every consumer of
  // that arbitrary (scatter/effect-scatter/polar-scatter) shares.
  test('hovering the first point shows its continent, coordinates, and size in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'polar-scatter/Basic.base', viewName: 'GDP vs life expectancy (polar scatter)' })

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

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    const option = await getChartOption(page) as {
      readonly series: readonly PolarScatterSeriesLike[]
      readonly dataset: readonly DatasetLike[]
    }
    const continent = option.series[0]?.name
    if (typeof continent !== 'string') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected polar-scatter series[0] to have a resolved continent name')
    }

    const sourceRows = option.dataset[0]?.source ?? []
    const firstContinentRow = sourceRows.find(row => row.s === continent)
    if (!firstContinentRow || firstContinentRow.y === null || firstContinentRow.size === undefined) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected at least one dataset row with a resolved size for continent ${continent}`)
    }

    expect(tooltipText).toContain(continent)
    expect(tooltipText).toContain(firstContinentRow.x)
    expect(tooltipText).toContain(firstContinentRow.y.toLocaleString('en-US'))
    expect(tooltipText).toContain(firstContinentRow.size.toLocaleString('en-US'))
  })
})
