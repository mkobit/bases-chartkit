import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, getSeriesDataCount, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface CandlestickRow {
  readonly x: string
  readonly open: number
  readonly close: number
  readonly low: number
  readonly high: number
}

interface DatasetLike {
  readonly source?: readonly CandlestickRow[]
}

test.describe('candlestick chart rendering', () => {
  // Regression coverage for bck-44j: createCandlestickChartOption does NOT
  // sort its normalizedData, so Bases' alphabetical-by-filename row order
  // survives into `dataset[0].source` order unchanged.
  //
  // dataIndex 25 (the raw/original last-row index) is deliberately NOT used
  // here, though a live run first assumed it would be: the transformer
  // configures dataZoom with `start: 50, end: 100` and ECharts' default
  // filterMode: 'filter' doesn't just hide out-of-window rows, it rebuilds
  // the series' SeriesData with a FRESH 0..count-1 index space covering only
  // the visible rows (confirmed via node_modules/echarts/lib/data/
  // DataStore.js's selectRange) -- so `getItemGraphicEl`/
  // getSeriesItemScreenPosition address that smaller, re-numbered filtered
  // index space, not the original 26-row order. getSeriesDataCount reads the
  // live, already-filtered count; its last index (count - 1) is the visible
  // window's most-recent candle, which is always AAPL-Day-25 regardless of
  // the exact 50%/100% rounding, since `end: 100` always includes the
  // maximum-value row. Read that row's own Date/OHLC values live off
  // dataset[0].source (unaffected by the series-level filtering) rather than
  // hardcoding them, so this doesn't silently drift if the fixture changes.
  // Fixed for bck-44x: the tooltip consistently truncated to "2024-01-30111"
  // (date + one value only, missing Open/Low) because ECharts' dimension
  // inference locks in each value dim's `name` from this dataset's own
  // object-row keys (open/close/low/high) before WhiskerBoxCommonMixin's
  // defaultTooltip:true template dims ('open'/'close'/'lowest'/'highest') get
  // a chance to apply -- that template only fills in defaultTooltip when a
  // dim's name is still unset, so none of the 4 OHLC values were flagged and
  // ECharts fell back to showing just one. Fixed by declaring `encode.
  // tooltip` explicitly on the series (see candlestick.ts), bypassing that
  // detection path entirely.
  test('hovering the last candle shows its date and OHLC values in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'candlestick/Basic.base', viewName: 'AAPL stock analysis' })

    // series[0] uses datasetIndex rather than an inline `data` array, so
    // dataset readiness (not series[0].data) is the real signal here.
    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly dataset?: readonly DatasetLike[] } | null
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Bases can still be re-rendering (a later setOption call landing as
    // indexing catches up) even after the poll above finds a non-empty
    // dataset -- wait for full indexing first so this read, the filtered
    // count below, and hoverChartDataPointAndGetTooltip's own internal wait
    // all observe the same, final state.
    await waitForVaultIndexed(page)

    const option = await getChartOption(page) as { readonly dataset: readonly DatasetLike[] }
    const sourceRows = option.dataset[0]?.source ?? []
    const lastRow = sourceRows.at(-1)
    if (!lastRow) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected at least one candlestick dataset row')
    }

    const filteredCount = await getSeriesDataCount(page, { seriesIndex: 0 })
    if (filteredCount === 0) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected at least one candlestick row inside the dataZoom window')
    }

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: filteredCount - 1 })

    // Regression coverage for bck-i9b.8: candlestick's default
    // (formatter-less) tooltip hit the same object-row labeling gap as
    // scatter.ts's identical comment -- confirmed live before this fix, the
    // 4 OHLC values rendered as a bare, unlabeled comma-joined list with no
    // way to tell which number was which. candlestick.ts's custom formatter
    // now builds the whole tooltip itself (including the Date header ECharts'
    // automatic axis-pointer header would otherwise supply, since setting a
    // component-level `tooltip.formatter` bypasses that default entirely) and
    // labels each OHLC value explicitly.
    expect(tooltipText).toContain(lastRow.x)
    expect(tooltipText).toContain(`Open: ${lastRow.open.toLocaleString('en-US')}`)
    expect(tooltipText).toContain(`Close: ${lastRow.close.toLocaleString('en-US')}`)
    expect(tooltipText).toContain(`Low: ${lastRow.low.toLocaleString('en-US')}`)
    expect(tooltipText).toContain(`High: ${lastRow.high.toLocaleString('en-US')}`)
  })
})
