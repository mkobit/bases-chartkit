import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface StackedBarSeriesLike {
  readonly name?: string
}

interface StackedBarRow {
  readonly x: string
  readonly y: number | null
  readonly s: string
}

interface DatasetLike {
  readonly source?: readonly StackedBarRow[]
}

test.describe('stacked-bar chart rendering', () => {
  // Regression coverage for bck-44j: stacked-bar is cartesian.ts's 'bar' path
  // with seriesProp set, so (unlike bar's single unnamed-yAxisLabel series)
  // it builds one filtered series PER unique Region value, in first-appearance
  // order, each with only that region's own rows in original relative order.
  // Hand-tracing which Quarter/Region combination ends up at a given
  // seriesIndex/dataIndex would duplicate the transformer's own grouping
  // logic and silently drift if the fixture data changes. Instead: dataset[0]
  // (unlike the per-series filterDatasets) holds the full, un-transformed
  // row list as a literal `source` array, so it's readable straight off the
  // live option -- read series[0]'s resolved name (a region) and dataset[0]'s
  // first row for that region, hover exactly that point, and assert the
  // tooltip reflects those same dynamically-read values.
  test('hovering the first bar of the first region series shows its region, quarter, and revenue in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'stacked-bar/Basic.base', viewName: 'Revenue by quarter (stacked)' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly dataset?: readonly DatasetLike[] } | null
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Bases can still be re-rendering (a later setOption call landing as
    // indexing catches up) even after the poll above finds a non-empty
    // dataset -- capturing the resolved series name/row before that settles
    // risks a snapshot that no longer matches what's on screen by the time
    // the hover below actually reads the tooltip. Wait for full indexing
    // first so this read and hoverChartDataPointAndGetTooltip's own internal
    // wait observe the same, final state.
    await waitForVaultIndexed(page)

    // Read AFTER hovering, not before: hoverChartDataPointAndGetTooltip's own
    // internal position-stability poll is the strongest available settling
    // signal available, stronger than waitForVaultIndexed alone -- reading
    // the comparison values immediately after it resolves guarantees they
    // describe the exact same render the tooltip came from. seriesIndex 0
    // and dataIndex 0 are fixed/known ahead of time, so this doesn't need
    // the resolved region name/row to start the hover.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    const option = await getChartOption(page) as {
      readonly series: readonly StackedBarSeriesLike[]
      readonly dataset: readonly DatasetLike[]
    }
    const region = option.series[0]?.name
    if (typeof region !== 'string') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected stacked-bar series[0] to have a resolved region name')
    }

    const sourceRows = option.dataset[0]?.source ?? []
    const firstRegionRow = sourceRows.find(row => row.s === region)
    if (!firstRegionRow || firstRegionRow.y === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected at least one dataset row for region ${region}`)
    }

    // Regression coverage for bck-i9b.10 -- see bar-chart-rendering.e2e.ts's
    // identical comment for the underlying default-tooltip limitation this
    // shared cartesian.ts formatter now fixes. Here seriesProp is set, so
    // each line is labeled by its resolved region name rather than
    // yAxisLabel.
    expect(tooltipText).toContain(`Quarter: ${firstRegionRow.x}`)
    expect(tooltipText).toContain(`${region}: ${firstRegionRow.y.toLocaleString('en-US')}`)
  })
})
