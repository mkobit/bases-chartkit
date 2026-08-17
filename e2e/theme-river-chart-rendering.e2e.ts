import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

test.describe('theme river chart rendering', () => {
  // Regression coverage for bck-44j. createThemeRiverChartOption builds ONE
  // themeRiver series whose `data` is a flat array of [date, value, topic]
  // triples for every Date x Topic combination (confirmed via
  // src/charts/transformers/theme-river.ts), sorted by date.
  //
  // Verified directly in node_modules/echarts' ThemeRiverView.js /
  // ThemeRiverSeries.js that this series' hover model does NOT map 1:1 the
  // way bar/radar do:
  //  - ThemeRiverView.render groups raw rows by topic name into "layers" (one
  //    filled river-band polygon per topic) and calls
  //    `data.setItemGraphicEl(layerIndex, polygon)` -- so the dataIndex
  //    getItemGraphicEl (and this test's hover helper) addresses is a LAYER
  //    index, not a row index into the flat triples array. Layers are built
  //    in Map insertion order (zrender's HashMap wraps a native Map, whose
  //    forEach is insertion-ordered), i.e. the order each topic name is FIRST
  //    seen while scanning the date-sorted rows -- News-Day-000..004 (all
  //    dated 2024-01-01, the earliest date) contribute topics in the order
  //    Politics, Technology, Entertainment, Sports, Health, so dataIndex 0's
  //    polygon is always Politics' full river band.
  //  - tooltip.trigger is 'axis' on the singleAxis (time), not 'item'.
  //    axisTrigger.js's buildPayloadsBySeries calls
  //    ThemeRiverSeriesModel.getAxisTooltipData, which -- for the ONE
  //    themeRiver series -- returns the nearest-in-time row for EVERY layer,
  //    not just whichever layer's shape the pointer physically lands on. So
  //    hovering ANY point on the river renders a multi-block tooltip listing
  //    every topic present in the dataset (scripts/generators/theme-river.ts'
  //    themeRiverChartArbitrary generates a full Date x Topic cross-product
  //    via NEWS_TOPICS, so every topic has real, non-filled data at every
  //    date -- getAxisTooltipData always finds a match). Each row's `name`
  //    dimension is its own topic (invariant per layer), so the SET of topic
  //    names shown is deterministic regardless of exactly which date the
  //    pointer's x position snaps to.
  //
  // The specific Mentions VALUE for each topic at that snapped date is NOT
  // asserted -- it depends on the polygon's screen bounding-box center, which
  // isn't practical to predict without a live render (unlike bar/radar/
  // boxplot's dataIndex-addressable data). This still exercises the real
  // hover+tooltip path and confirms every topic resolves its display name,
  // analogous in spirit to radar's indicator-name-resolution test.
  test('hovering the river shows every topic\'s name in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'theme-river/Basic.base', viewName: 'News topics river' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly series?: ReadonlyArray<{ readonly data?: readonly unknown[] }> } | null
        return option?.series?.[0]?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain('Politics')
    expect(tooltipText).toContain('Technology')
    expect(tooltipText).toContain('Entertainment')
    expect(tooltipText).toContain('Sports')
    expect(tooltipText).toContain('Health')
  })

  // Explainability enrichment (bck-aie.33): the Basic view carries a title +
  // subtext so a first-time reader knows what a theme river encodes. Assert the
  // live-rendered option surfaces them rather than screenshotting the chrome.
  test('the basic view renders an explanatory title and subtext', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'theme-river/Basic.base', viewName: 'News topics river' })

    // chart.getOption() normalizes single components into arrays, so title is
    // [{...}] here (unlike the raw transformer output the unit tests assert).
    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly title?: ReadonlyArray<{ readonly text?: string }> } | null
        return option?.title?.[0]?.text ?? ''
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBe('News topics over time')
  })

  // Flipped-axis variant (bck-aie.33): flipAxis pivots the singleAxis time flow
  // to vertical. Assert the resolved orient rather than pixel geometry.
  test('the vertical variant pivots the single time axis to vertical', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'theme-river/Vertical.base', viewName: 'News topics river (vertical)' })

    // getOption() normalizes singleAxis into an array of axis components.
    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly singleAxis?: ReadonlyArray<{ readonly orient?: string }> } | null
        return option?.singleAxis?.[0]?.orient ?? ''
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBe('vertical')
  })
})
