import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface FunnelDataPointLike {
  readonly name: string
  readonly value: number
}

test.describe('funnel chart rendering', () => {
  // Regression coverage for bck-44j. Unlike bar/radar/pie,
  // src/charts/transformers/funnel.ts re-sorts its (grouped) data descending
  // by value before rendering, independent of note-file order -- a stage's
  // dataIndex isn't safely predictable from a specific Funnel-Stage-N.md
  // file, so read the live, already-sorted option and hover whatever landed
  // at dataIndex 0 rather than assuming it's Funnel-Stage-0.md's "Visit"
  // stage (which happens to have the highest Population, but that's this
  // vault's data being coincidentally pre-sorted, not something the test
  // should rely on).
  test('hovering the top funnel stage shows its name and value in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'funnel/Basic.base', viewName: 'User journey funnel' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly series?: ReadonlyArray<{ readonly data?: readonly unknown[] }> } | null
        return option?.series?.[0]?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    const option = await getChartOption(page) as { readonly series: ReadonlyArray<{ readonly data: readonly FunnelDataPointLike[] }> }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- verified with `tsc --noEmit` directly: removing this produces TS2532 'Object is possibly undefined' under noUncheckedIndexedAccess. The lint rule's own type analysis disagrees with tsc here.
    const funnelSeries = option.series[0]!
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- see above.
    const topStage = funnelSeries.data[0]!

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain(topStage.name)
    // funnel.ts's tooltip formatter is the literal string '{b} : {c}%' --
    // {c} is substituted with the stage's raw value (no percent-of-total
    // math applied despite the trailing '%'), so the rendered text really
    // does end in e.g. '100%' for a value of 100.
    expect(tooltipText).toContain(`${topStage.value}%`)
  })
})
