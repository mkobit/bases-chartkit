import { test, expect } from './fixtures/obsidian'
import {
  asOptionLike,
  evaluateObsidian,
  findIsolatedScatterTarget,
  getChartOption,
  hoverChartDataPointAndGetTooltip,
  type ScatterDatasetRowLike,
  waitForVaultIndexed,
  VAULT_INDEXED_POLL_TIMEOUT_MS,
} from './helpers/evaluate'

interface ScatterSeriesLike {
  readonly name?: string
}

interface DatasetLike {
  readonly source?: readonly ScatterDatasetRowLike[]
}

test.describe('scatter chart rendering', () => {
  // Regression coverage for bck-44j: scatter.ts groups rows into one ECharts
  // series per seriesProp value (Continent) via a filter-transform dataset,
  // so most dataIndex values can't be predicted without replicating that
  // grouping. seriesIndex 0/dataIndex 0 is the one combination that's still
  // statically knowable without doing that: ECharts' built-in filter
  // transform preserves row order (confirmed in
  // node_modules/echarts/lib/component/transform/filterTransform.js -- it
  // walks the upstream data 0..count() in order), and series 0 is always the
  // continent of the very first row -- so that row can never land anywhere
  // but dataIndex 0 of series 0, regardless of how the rest of the rows
  // group.
  test('hovering the first point shows its continent and coordinates in the tooltip', async ({
    obsidianPage: { page },
  }) => {
    await evaluateObsidian(
      page,
      async (app, args: { path: string; viewName: string }) => {
        await new Promise<void>(resolve => {
          app.workspace.onLayoutReady(() => resolve())
        })
        const leaf = app.workspace.getLeaf('tab')
        await leaf.setViewState({
          type: 'bases',
          state: { file: args.path, viewName: args.viewName },
          active: true,
        })
      },
      { path: 'scatter/Basic.base', viewName: 'GDP vs life expectancy' },
    )

    await expect
      .poll(
        async () => {
          const option = asOptionLike<{ readonly dataset?: readonly DatasetLike[] }>(
            await getChartOption(page),
          )
          return option?.dataset?.[0]?.source?.length ?? 0
        },
        { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
      )
      .toBeGreaterThan(0)

    await waitForVaultIndexed(page)

    const option = asOptionLike<{
      readonly series: readonly ScatterSeriesLike[]
      readonly dataset: readonly DatasetLike[]
    }>(await getChartOption(page))
    expect(option).not.toBeNull()
    if (option === null) {
      return
    }
    const target = findIsolatedScatterTarget(option.series, option.dataset[0]?.source ?? [])
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, {
      seriesIndex: target.seriesIndex,
      dataIndex: target.dataIndex,
    })

    // Regression coverage for bck-i9b.8: ECharts' default formatter-less
    // tooltip can't label multi-dim values for this transformer's object-row
    // dataset (isValueMultipleLine's array check in
    // seriesFormatTooltip.js never fires for an object -- confirmed live
    // before this fix, the tooltip showed a bare, unlabeled "31.1  62.6
    // Asia"). scatter.ts's custom formatter reads the raw row directly and
    // labels each value with its axis name instead.
    expect(tooltipText).toContain(target.row.s)
    expect(tooltipText).toContain(`GDP: ${target.row.x}`)
    expect(tooltipText).toContain(`Life Expectancy: ${target.row.y?.toLocaleString('en-US')}`)
  })
})
