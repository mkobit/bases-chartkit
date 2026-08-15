import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface WaterfallSeriesLike {
  readonly name?: string
  readonly data?: ReadonlyArray<number | string>
}

interface CategoryAxisLike {
  readonly data?: readonly string[]
}

test.describe('waterfall chart rendering', () => {
  // Regression coverage for bck-44j: waterfall.ts builds three stacked bar
  // series per Step -- an invisible '_base' offset (tooltip.show: false, so
  // it never appears in the axis-trigger tooltip) plus visible 'Increase'/
  // 'Decrease' series, only one of which holds a real number at any given
  // dataIndex (the other holds the string '-'). Step order itself is
  // preserved from the source rows (no sort/reorder in the transformer), but
  // which of the two visible series is the real one at a given index depends
  // on that step's sign -- read live which series actually has a number
  // rather than assuming, and hover that one. The chart also installs a
  // fully custom tooltip formatter (not the default renderer), producing
  // '<name><br/>Increase: <value>' / '...Decrease: <value>' text.
  test('hovering a rising step\'s bar shows its step name and increase value in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'waterfall/Basic.base', viewName: 'Budget waterfall' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly series?: readonly WaterfallSeriesLike[] } | null
        const increaseSeries = option?.series?.find(s => s.name === 'Increase')
        return increaseSeries?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    const option = await getChartOption(page) as {
      readonly series: readonly WaterfallSeriesLike[]
      readonly xAxis: CategoryAxisLike | readonly CategoryAxisLike[]
    }
    const seriesIndex = option.series.findIndex(s => s.name === 'Increase')
    const increaseSeries = option.series[seriesIndex]
    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis

    const dataIndex = (increaseSeries?.data ?? []).findIndex(v => typeof v === 'number')
    const stepName = xAxis?.data?.[dataIndex]
    const riseValue = increaseSeries?.data?.[dataIndex]
    if (dataIndex < 0 || !stepName || typeof riseValue !== 'number') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected at least one rising step with a numeric Increase value')
    }

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex, dataIndex })

    expect(tooltipText).toContain(stepName)
    expect(tooltipText).toContain('Increase')
    expect(tooltipText).toContain(riseValue.toLocaleString('en-US'))
  })

  // Coverage for bck-h0b's absolute-total bars. Basic.base binds
  // totalProp: note.IsTotal, so Starting Balance / Net Balance render as a
  // dedicated 'Total' series (a real number at those indices, '-' elsewhere)
  // drawn from zero rather than stacked on the running delta sum. The custom
  // formatter labels them '<step><br/>Total: <value>'. Read which index holds
  // the total live and hover exactly that bar, same as the rising-step test.
  test('hovering an absolute-total bar shows its step name and total value in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'waterfall/Basic.base', viewName: 'Budget waterfall' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly series?: readonly WaterfallSeriesLike[] } | null
        const totalSeries = option?.series?.find(s => s.name === 'Total')
        return totalSeries?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    const option = await getChartOption(page) as {
      readonly series: readonly WaterfallSeriesLike[]
      readonly xAxis: CategoryAxisLike | readonly CategoryAxisLike[]
    }
    const seriesIndex = option.series.findIndex(s => s.name === 'Total')
    const totalSeries = option.series[seriesIndex]
    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis

    const dataIndex = (totalSeries?.data ?? []).findIndex(v => typeof v === 'number')
    const stepName = xAxis?.data?.[dataIndex]
    const totalValue = totalSeries?.data?.[dataIndex]
    if (dataIndex < 0 || !stepName || typeof totalValue !== 'number') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('expected at least one absolute-total bar with a numeric value')
    }

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex, dataIndex })

    expect(tooltipText).toContain(stepName)
    expect(tooltipText).toContain('Total')
    // The formatter prints the raw number (String(value)), not a locale-grouped
    // one, so match that exactly rather than toLocaleString.
    expect(tooltipText).toContain(String(totalValue))
  })
})
