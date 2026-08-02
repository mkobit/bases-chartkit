import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

test.describe('calendar chart rendering', () => {
  // Regression coverage for bck-44j: createCalendarChartOption sorts its
  // series data by date ascending (R.sortBy) before handing it to ECharts, so
  // dataIndex 0 is the earliest date in the dataset, not necessarily whichever
  // note is alphabetically first by filename. Mood-Day-000.md (the vault's
  // deterministically-generated first note) is generated as
  // CALENDAR_YEAR_START (2024-01-01) plus zero days -- the globally earliest
  // date by construction (scripts/generators/heatmap.ts's
  // calendarChartArbitrary iterates sequential days from that anchor with no
  // reordering) -- so it lands at dataIndex 0 regardless of the sort.
  test('hovering the first calendar cell shows its date and value in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'calendar/Basic.base', viewName: 'Mood calendar' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly series?: ReadonlyArray<{ readonly data?: readonly unknown[] }> } | null
        return option?.series?.[0]?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Mood-Day-000.md is { Date: "2024-01-01", Mood: 7 }.
    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: 0 })

    // createCalendarChartOption's tooltip.formatter is a custom
    // `${p.value[0]} : ${p.value[1]}` template (raw string interpolation, not
    // ECharts' default formatter) -- no thousand-separator commas.
    expect(tooltipText).toContain('2024-01-01')
    expect(tooltipText).toContain('7')
  })
})
