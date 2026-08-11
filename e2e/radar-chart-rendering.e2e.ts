import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

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
    // only configures one. radar/ sorts alphabetically after calendar/ and
    // heatmap/ (both large-volume directories), so this test is at risk of a
    // cold-start indexing timeout, same as rose/ and effect-scatter/.
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

  // Regression coverage for bck-0zd/bck-44j: radar is the exemplar for
  // zrender-Group-based series (one dataIndex = a polyline + an unfilled,
  // non-hit-testable polygon + a group of small per-vertex symbol dots, not
  // one discrete shape like a bar). Confirms hoverChartDataPointAndGetTooltip's
  // leaf-shape traversal lands on an actual hoverable vertex symbol.
  test('hovering a character\'s radar shape shows its name and stat values in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'radar/Basic.base', viewName: 'Character stats radar' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly radar?: ReadonlyArray<{ readonly indicator?: readonly unknown[] }> } | null
        return option?.radar?.[0]?.indicator?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Character-0.md (the vault's deterministically-generated first note for
    // this chart type) is { Name: "Conan", Strength: 15, Intelligence: 18,
    // Agility: 16 }.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    expect(tooltipText).toContain('Draven')
    expect(tooltipText).toContain('Strength')
    expect(tooltipText).toContain('15')
    expect(tooltipText).toContain('Intelligence')
    expect(tooltipText).toContain('16')
    expect(tooltipText).toContain('Agility')
    expect(tooltipText).toContain('12')
  })
})
