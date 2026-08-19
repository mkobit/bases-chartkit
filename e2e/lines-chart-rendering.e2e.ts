import { test, expect } from './fixtures/obsidian'
import { asOptionLike, evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface LinesOptionLike {
  readonly series?: ReadonlyArray<{ readonly name?: string, readonly data?: readonly unknown[] }>
}

test.describe('lines chart rendering', () => {
  // Regression coverage for bck-44j: a 'lines' series data item is a straight
  // 2-point segment (`coords: [[x1,y1],[x2,y2]]`) rendered by chart/helper/Line.js
  // as a zrender Group containing a single ECLinePath leaf (fromSymbol/toSymbol
  // default to 'none' here, so no extra children) -- directly compatible with
  // the existing Group-traversal heuristic. A segment's own bounding-box
  // center always lies exactly on the line (it's the segment's midpoint), and
  // zrender/graphic/Path.js's hit-test uses `Math.max(lineWidth,
  // strokeContainThreshold)` -- `strokeContainThreshold` defaults to 5px, so
  // even lineStyle.width: 2 (transformers/lines.ts) gets a 5px-wide hit band
  // well clear of a single-pixel hover point.
  test('hovering a route line shows its route type in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'lines/Basic.base', viewName: 'Route lines' })

    await expect.poll(
      async () => {
        const opt = asOptionLike<LinesOptionLike>(await getChartOption(page))
        return opt?.series?.[0]?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // transformers/lines.ts groups rows by the derived RouteType
    // (Outbound/Return) into separate series via Object.keys(groupBy(...)),
    // whose insertion order isn't something to hand-derive -- read the real
    // series name at seriesIndex 0 from the live option instead.
    const option = asOptionLike<LinesOptionLike>(await getChartOption(page))
    const seriesName = option?.series?.[0]?.name ?? ''
    expect(seriesName.length).toBeGreaterThan(0)

    // A 'lines' data item carries no per-item 'name' (only `coords`).
    // chart/lines/LinesSeries.js's formatTooltip calls
    // `itemModel.get('name')`, and model/Model.js's `get()` climbs to the
    // parentModel (the series itself, per data/SeriesData.js's
    // getItemModel) whenever a key isn't found locally -- so the tooltip
    // ends up showing the series-level name (the route type), not any
    // per-row coordinate.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain(seriesName)
  })
})
