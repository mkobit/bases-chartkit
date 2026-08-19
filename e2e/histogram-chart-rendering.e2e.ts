import { test, expect } from './fixtures/obsidian'
import { asOptionLike, evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, waitForVaultIndexed, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface HistogramSeriesLike {
  readonly type?: string
  readonly name?: string
  readonly data?: readonly number[]
}

interface CategoryAxisLike {
  readonly data?: readonly string[]
}

test.describe('histogram chart rendering', () => {
  // Regression coverage for bck-44j: the histogram transformer bins raw
  // Score values into ranges (Sturges' rule, since Basic.base sets no
  // binCount/binWidth) before building series data, so a raw note's Score
  // does not map to "the first bar's tooltip" -- the bin boundaries and
  // per-bin counts are only known after binning. Read the live, already
  // -binned xAxis category labels and series counts from getChartOption(),
  // hover the most-populated bin (any zero-count bin would still render but
  // as a zero-height bar, a less reliable hover target), and assert the
  // tooltip reflects that same bin label/count.
  test('hovering the most populated bin shows its range and count in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'histogram/Basic.base', viewName: 'Score distribution' })

    await expect.poll(
      async () => {
        const option = asOptionLike<{ readonly series?: readonly HistogramSeriesLike[] }>(await getChartOption(page))
        const barSeries = option?.series?.find(s => s.type === 'bar')
        return barSeries?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Bases can still be re-rendering (a later setOption call landing as
    // indexing catches up) even after the poll above finds non-empty bins --
    // capturing "expected" bin values before that settles risks a snapshot
    // that no longer matches what's on screen by the time the hover below
    // actually reads the tooltip. Wait for full indexing first so this read
    // and hoverChartDataPointAndGetTooltip's own internal wait observe the
    // same, final state.
    await waitForVaultIndexed(page)

    const option = asOptionLike<{
      readonly series: readonly HistogramSeriesLike[]
      readonly xAxis: CategoryAxisLike | readonly CategoryAxisLike[]
    }>(await getChartOption(page))
    if (option === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected a non-null chart option')
    }
    const seriesIndex = option.series.findIndex(s => s.type === 'bar')
    const histogramSeries = option.series[seriesIndex]
    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
    const counts = histogramSeries?.data ?? []

    const dataIndex = counts.reduce(
      (maxIdx, count, idx) => (count > (counts[maxIdx] ?? -Infinity) ? idx : maxIdx),
      0,
    )
    const binLabel = xAxis?.data?.[dataIndex]
    const count = counts[dataIndex]
    if (!binLabel || count === undefined) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected a resolved bin label and count at dataIndex ${dataIndex}`)
    }

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex, dataIndex })

    expect(tooltipText).toContain(binLabel)
    expect(tooltipText).toContain(histogramSeries?.name ?? 'Frequency')
    expect(tooltipText).toContain(String(count))
  })
})
