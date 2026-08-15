import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface AreaSeriesLike {
  readonly name?: string
}

interface AreaRow {
  readonly x: string
  readonly y: number | null
  readonly s: string
}

interface DatasetLike {
  readonly source?: readonly AreaRow[]
}

test.describe('area chart rendering', () => {
  // Regression coverage for bck-44j: area-chart is a pure rendering variant
  // of line-chart -- cartesian.ts's 'line' path with areaStyle:{} forced on
  // (see src/views/area-chart-view.ts). Its Basic.base ships a multi-series
  // Month x Region dataset (notePrefix 'Area-Revenue') with seriesProp set,
  // so -- like stacked-bar -- it builds one filtered series PER unique Region
  // value in first-appearance order. Hand-tracing which Date/Region combo
  // lands at a given seriesIndex/dataIndex would duplicate the transformer's
  // grouping and drift if the fixture changes, so this reads series[0]'s
  // resolved region name and dataset[0]'s first row for that region off the
  // live option, hovers exactly that point, and asserts the tooltip matches.
  test('hovering the first point of the first region series shows its region, date, and revenue in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'area/Basic.base', viewName: 'Sales by region (area)' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly dataset?: readonly DatasetLike[] } | null
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // See stacked-bar-chart-rendering.e2e.ts for why this waits for full
    // indexing before reading the comparison values, then reads them AFTER
    // the hover's own position-stability poll resolves -- so the assertion
    // values describe the exact render the tooltip came from.
    await waitForVaultIndexed(page)

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    const option = await getChartOption(page) as {
      readonly series: readonly AreaSeriesLike[]
      readonly dataset: readonly DatasetLike[]
    }
    const region = option.series[0]?.name
    if (typeof region !== 'string') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected area series[0] to have a resolved region name')
    }

    const sourceRows = option.dataset[0]?.source ?? []
    const firstRegionRow = sourceRows.find(row => row.s === region)
    if (!firstRegionRow || firstRegionRow.y === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected at least one dataset row for region ${region}`)
    }

    // seriesProp is set, so each area is labeled by its resolved region name
    // rather than yAxisLabel (see stacked-bar-chart-rendering.e2e.ts). The
    // x-axis label is the Date prop's displayName; a Temporal.PlainDate Value
    // renders as its ISO date string via safeToString.
    expect(tooltipText).toContain(`Date: ${firstRegionRow.x}`)
    expect(tooltipText).toContain(`${region}: ${firstRegionRow.y.toLocaleString('en-US')}`)
  })

  // Coverage for the FlippedAxis.base variant (bck-aie.30): flipAxis:true is a
  // real structural change, not cosmetic -- cartesian.ts swaps the category and
  // value axes (and each series' encode) so the Date category runs up the
  // y-axis and Revenue along the x-axis. Assert the swap landed on the live
  // ECharts option rather than a screenshot: it proves the config flowed
  // config -> AreaChartView -> transformer -> rendered option end-to-end.
  test('the flipped-axis variant renders the category axis on y and the value axis on x', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'area/FlippedAxis.base', viewName: 'Sales by region (flipped axis)' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly dataset?: readonly DatasetLike[] } | null
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // getOption() normalizes xAxis/yAxis to arrays. Default (un-flipped) area
    // puts the Date category on x and Revenue value on y; flipAxis inverts
    // both, so this assertion fails if the option ever regressed to default.
    const option = await getChartOption(page) as {
      readonly xAxis?: readonly { readonly type?: string }[]
      readonly yAxis?: readonly { readonly type?: string, readonly data?: readonly unknown[] }[]
    } | null
    expect(option?.xAxis?.[0]?.type).toBe('value')
    expect(option?.yAxis?.[0]?.type).toBe('category')
    expect(option?.yAxis?.[0]?.data?.length ?? 0).toBeGreaterThan(0)
  })
})
