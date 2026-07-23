import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption } from './helpers/evaluate'
import type { SankeySeriesOption } from 'echarts'

interface SankeyOptionLike {
  readonly series?: readonly SankeySeriesOption[]
}

test.describe('sankey chart rendering', () => {
  test('renders nodes and links for a valid acyclic funnel', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'sankey/Basic.base', viewName: 'User funnel flow (sankey)' })

    await expect.poll(
      async () => {
        const opt = await getChartOption(page) as SankeyOptionLike | null
        return opt?.series?.[0]?.links?.length ?? 0
      },
      { timeout: 60_000 },
    ).toBeGreaterThan(0)

    const option = await getChartOption(page) as SankeyOptionLike | null
    expect(option?.series?.[0]?.type).toBe('sankey')
    expect(option?.series?.[0]?.data?.length ?? 0).toBeGreaterThan(0)
  })

  // Regression test for obsidian-bases-charts-cqz: ECharts' sankey series
  // requires a DAG and throws mid-render ("sankey is a directed acyclic
  // graph") on any source/target cycle -- a single bad row in the underlying
  // Bases data used to silently break the whole chart with no user-facing
  // error. SankeyChartView now detects a cycle before handing links to
  // ECharts and clears the chart with a Notice instead of crashing.
  // Fixture notes are created at runtime (rather than committed to the
  // example vault) so the showcase vault never ships intentionally-cyclic
  // data alongside its documented, visually-verified examples.
  test('cyclic source/target data shows a Notice and clears the chart instead of crashing', async ({ obsidianPage: { page } }) => {
    await evaluateObsidian(page, async (app) => {
      await new Promise<void>((resolve) => {
        app.workspace.onLayoutReady(() => {
          resolve()
        })
      })

      const folder = 'sankey-cycle-regression'
      await app.vault.createFolder(folder).catch(() => undefined)
      await app.vault.createFolder(`${folder}/notes`).catch(() => undefined)
      await app.vault.create(`${folder}/notes/A.md`, '---\nSource: "X"\nTarget: "Y"\nAmount: 5\n---\n')
      await app.vault.create(`${folder}/notes/B.md`, '---\nSource: "Y"\nTarget: "X"\nAmount: 3\n---\n')
      await app.vault.create(`${folder}/Cycle.base`, [
        'properties:',
        '  note.Amount:',
        '    displayName: Amount',
        '  note.Source:',
        '    displayName: Source',
        '  note.Target:',
        '    displayName: Target',
        'views:',
        '  - type: sankey-chart',
        '    name: Cycle regression',
        '    xAxisProp: note.Source',
        '    yAxisProp: note.Target',
        '    valueProp: note.Amount',
        '    filters:',
        '      and:',
        `        - file.folder == "${folder}/notes"`,
        '',
      ].join('\n'))

      const leaf = app.workspace.getLeaf('tab')
      await leaf.setViewState({
        type: 'bases',
        state: { file: `${folder}/Cycle.base`, viewName: 'Cycle regression' },
        active: true,
      })
    })

    const cycleNotice = page.locator('.notice', { hasText: 'cycle' })
    await expect(cycleNotice).toBeVisible({ timeout: 60_000 })

    // chart.clear() (the base view's empty-state path for a null
    // getChartOption) resets ECharts to no series at all, not a sankey
    // series with empty arrays -- assert on that directly rather than
    // defaulting through optional chaining, which would pass even if
    // `series` were missing for an unrelated reason.
    const option = await getChartOption(page) as SankeyOptionLike | null
    expect(option?.series ?? []).toHaveLength(0)
  })
})
