import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface ParetoSeriesLike {
  readonly type?: string
  readonly name?: string
}

interface ParetoRow {
  readonly name: string
  readonly value: number
  readonly cumulative: number
}

interface DatasetLike {
  readonly source?: readonly ParetoRow[]
}

test.describe('pareto chart rendering', () => {
  // Regression coverage for bck-44j: pareto.ts sorts rows descending by value
  // before building its dataset (normalizedData via R.sortBy [.., 'desc']),
  // so the alphabetically-first note is not necessarily at dataIndex 0 --
  // whichever product has the highest Sales is. There are also two series
  // sharing one dataset (a bar for the raw value, a line for cumulative %);
  // this targets the bar specifically, since that's what a user hovers to
  // read one product's own sales figure. Read the live dataset.source (the
  // already-sorted rows actually bound to the bar series via encode) rather
  // than re-sorting the fixture notes by hand.
  test('hovering the top-ranked bar shows its product and sales figure in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'pareto/Basic.base', viewName: 'Product sales (pareto)' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly dataset?: readonly DatasetLike[] } | null
        return option?.dataset?.[0]?.source?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    const option = await getChartOption(page) as {
      readonly series: readonly ParetoSeriesLike[]
      readonly dataset: readonly DatasetLike[]
    }
    const seriesIndex = option.series.findIndex(s => s.type === 'bar')
    const barSeries = option.series[seriesIndex]
    const dataset = option.dataset[0]

    const dataIndex = 0
    const row = dataset?.source?.[dataIndex]
    if (!row) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected a resolved dataset row at dataIndex ${dataIndex}`)
    }

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex, dataIndex })

    expect(tooltipText).toContain(row.name)
    expect(tooltipText).toContain(barSeries?.name ?? 'Sales')
    expect(tooltipText).toContain(String(row.value))
  })
})
