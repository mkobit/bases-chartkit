import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption } from './helpers/evaluate'

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
    }, { path: 'RPG_Stats.base', viewName: 'Character Stats Radar' })

    // Wait for the radar's indicator axes to be populated before asserting.
    // ECharts' getOption() always returns 'radar' as an array (it supports
    // multiple radar coordinate systems per chart), even though this view
    // only configures one.
    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly radar?: ReadonlyArray<{ readonly indicator?: readonly unknown[] }> } | null
        return option?.radar?.[0]?.indicator?.length ?? 0
      },
      { timeout: 30_000 },
    ).toBeGreaterThan(0)

    const option = await getChartOption(page) as { readonly radar: ReadonlyArray<{ readonly indicator: ReadonlyArray<{ readonly name: string }> }> }
    expect(option.radar[0]).toBeDefined()
    if (!option.radar[0]) {
      return
    }
    const indicatorNames = option.radar[0].indicator.map(indicator => indicator.name)

    // RPG_Stats.base declares display names ("Strength", "Intelligence",
    // "Agility") for the underlying note.Strength/note.Intelligence/note.Agility
    // properties. Buggy code shows the raw 'note.X' paths instead.
    expect(indicatorNames).toEqual(['Strength', 'Intelligence', 'Agility'])
  })
})
