import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface PolarLineSeriesLike {
  readonly name?: string
}

interface PolarLineRow {
  readonly x: string
  readonly y: number | null
  readonly s: string
}

interface DatasetLike {
  readonly source?: readonly PolarLineRow[]
}

test.describe('polar-line chart rendering', () => {
  // Regression coverage for bck-44j: polar-line.ts builds the same x/y/s
  // normalized-dataset + per-series filter-transform shape as cartesian.ts's
  // seriesProp path (see stacked-bar-chart-rendering.e2e.ts, the exemplar for
  // this pattern), just plotted on a polar (angle/radius) coordinate system
  // instead of cartesian. Each series is still a plain 'line' series, so
  // SymbolDraw still gives each dataIndex its own discrete symbol graphic
  // element (confirmed in node_modules/echarts/lib/chart/helper/SymbolDraw.js
  // -- coordinate-system-agnostic, same discrete-shape path bar/line use) --
  // getSeriesItemScreenPosition's existing transform-matrix handling for
  // polar coordinate systems (already exercised by radar) covers the
  // angle/radius -> screen mapping.
  //
  // Hand-tracing which Time/Server combination lands at a given
  // seriesIndex/dataIndex would duplicate the transformer's own grouping
  // logic and silently drift if the fixture data changes. Instead:
  // dataset[0] (unlike the per-series filterDatasets) holds the full,
  // un-transformed row list as a literal `source` array, so it's readable
  // straight off the live option -- read series[0]'s resolved name (a
  // server) and dataset[0]'s first row for that server, and assert the
  // tooltip reflects those same dynamically-read values.
  //
  // Read AFTER hovering, not before: a live run showed that capturing the
  // resolved series name/row before hovering -- even after
  // waitForVaultIndexed -- can still race a final settling render that lands
  // microtasks later. hoverChartDataPointAndGetTooltip's own internal
  // position-stability poll is the strongest available settling signal, so
  // reading the comparison values immediately after it resolves guarantees
  // they describe the exact same render the tooltip came from. seriesIndex 0
  // and dataIndex 0 are fixed/known ahead of time, so this doesn't need the
  // resolved name/row to start the hover.
  // Fixed for bck-44x, two separate bugs:
  // 1. A single-jump mouse move (hoverChartDataPointAndGetTooltip's default)
  // never fired ECharts' polar axis-pointer at all -- polar's angle
  // resolution needs a real, multi-step pointer path, unlike every other
  // trigger:'item'/cartesian trigger:'axis' chart in this codebase. Pass
  // moveSteps to break the final move into several mousemove events.
  // 2. Even with a stepped move, hovering dataIndex 0 read back the wrong
  // time bucket: TIME_SERVER_COMBINATIONS[0] (Server-1 @ 08:00) sampled
  // load: 0, and a radius of exactly 0 sits at the polar chart's literal
  // center -- the same pixel regardless of angle/time-bucket, so ECharts'
  // axis-pointer had no way to resolve which category was actually meant.
  // Fixed at the source in scripts/generators/polar.ts (load's min is now 1,
  // never 0).
  test('hovering the first point of the first server series shows its server, time, and load in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'polar-line/Basic.base', viewName: 'Server load (polar line)' })

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

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 }, 10)

    const option = await getChartOption(page) as {
      readonly series: readonly PolarLineSeriesLike[]
      readonly dataset: readonly DatasetLike[]
    }
    const server = option.series[0]?.name
    if (typeof server !== 'string') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected polar-line series[0] to have a resolved server name')
    }

    const sourceRows = option.dataset[0]?.source ?? []
    const firstServerRow = sourceRows.find(row => row.s === server)
    if (!firstServerRow || firstServerRow.y === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected at least one dataset row for server ${server}`)
    }

    expect(tooltipText).toContain(server)
    expect(tooltipText).toContain(firstServerRow.x)
    expect(tooltipText).toContain(firstServerRow.y.toLocaleString('en-US'))
  })

  // Explainability enrichment (bck-aie.27): the Basic view carries a title +
  // subtext, and the angle/radius axes are named, so a first-time reader knows
  // what a polar line encodes without hovering. Assert the live-rendered
  // option surfaces them rather than screenshotting the chrome.
  test('the basic view renders an explanatory title and named angle/radius axes', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'polar-line/Basic.base', viewName: 'Server load (polar line)' })

    // chart.getOption() normalizes single components into arrays, so
    // title/angleAxis/radiusAxis are [{...}] here (unlike the raw transformer
    // output the unit tests assert).
    await expect.poll(
      async () => {
        const option = await getChartOption(page) as {
          readonly title?: ReadonlyArray<{ readonly text?: string }>
          readonly angleAxis?: ReadonlyArray<{ readonly name?: string }>
          readonly radiusAxis?: ReadonlyArray<{ readonly name?: string }>
        } | null
        return {
          title: option?.title?.[0]?.text ?? '',
          angleAxisName: option?.angleAxis?.[0]?.name ?? '',
          radiusAxisName: option?.radiusAxis?.[0]?.name ?? '',
        }
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toEqual({
      title: 'Server load across time of day',
      angleAxisName: 'Time',
      radiusAxisName: 'Load',
    })
  })

  // Domain-specific stacking variant (bck-aie.27): stack + areaStyle turns the
  // per-server lines into a filled composition. Assert the resolved series
  // shape rather than pixel geometry.
  test('the stacked view renders each server series with stack and areaStyle', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'polar-line/Stacked.base', viewName: 'Total server load by time of day (stacked)' })

    // Poll on the full 4-server series count, not just non-empty -- Bases can
    // still be re-rendering (an earlier setOption call with a partial series
    // list) even after the first non-empty read (see the same caveat in the
    // hover test above).
    await expect.poll(
      async () => {
        const option = await getChartOption(page) as {
          readonly series?: ReadonlyArray<{ readonly stack?: string
            readonly areaStyle?: unknown }>
        } | null
        return option?.series?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBe(4)

    await waitForVaultIndexed(page)

    const option = await getChartOption(page) as {
      readonly series: ReadonlyArray<{ readonly stack?: string
        readonly areaStyle?: unknown }>
    }
    expect(option.series.length).toBe(4)
    for (const series of option.series) {
      expect(series.stack).toBe('total')
      expect(series.areaStyle).toBeDefined()
    }
  })
})
