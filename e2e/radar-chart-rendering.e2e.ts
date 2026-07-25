import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

test.describe('radar chart rendering', () => {
  // Regression test for obsidian-bases-charts-769: wide-format (metricProps)
  // radar charts must resolve each indicator axis through the Bases-configured
  // display name, not show the raw property path (e.g. 'note.Strength').
  test('resolves display names for wide-format metricProps indicator axes', async ({ obsidianPage: { page } }) => {
    await evaluateObsidian(page, async (app, args: { path: string, viewName: string }) => {
      await new Promise<void>((resolve) => {
        app.workspace.onLayoutReady(() => {
          resolve()
        })
      })
      const leaf = app.workspace.getLeaf('tab')
      await leaf.setViewState({
        type: 'bases',
        state: { file: args.path, viewName: args.viewName },
        active: true,
      })
    }, { path: 'radar/Basic.base', viewName: 'Character stats radar' })

    // Wait for the radar's indicator axes to be populated before asserting.
    // ECharts' getOption() always returns 'radar' as an array (it supports
    // multiple radar coordinate systems per chart), even though this view
    // only configures one. radar/ sorts alphabetically after every
    // large-volume chart-type directory (calendar, heatmap, theme-river), so
    // this test is at the highest risk of a cold-start indexing timeout.
    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly radar?: ReadonlyArray<{ readonly indicator?: readonly unknown[] }> } | null
        return option?.radar?.[0]?.indicator?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    const option = await getChartOption(page) as { readonly radar: ReadonlyArray<{ readonly indicator: ReadonlyArray<{ readonly name: string }> }> }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- verified with `tsc --noEmit` directly: removing this produces TS2532 'Object is possibly undefined' under noUncheckedIndexedAccess. The lint rule's own type analysis disagrees with tsc here.
    const indicatorNames = option.radar[0]!.indicator.map(indicator => indicator.name)

    // radar/Basic.base declares display names ("Strength", "Intelligence",
    // "Agility") for the underlying note.Strength/note.Intelligence/note.Agility
    // properties. Buggy code shows the raw 'note.X' paths instead.
    expect(indicatorNames).toEqual(['Strength', 'Intelligence', 'Agility'])
  })
})
