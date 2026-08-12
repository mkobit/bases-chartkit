import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'
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
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
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
    await expect(cycleNotice).toBeVisible({ timeout: VAULT_INDEXED_POLL_TIMEOUT_MS })

    // chart.clear() (the base view's empty-state path for a null
    // getChartOption) resets ECharts to no series at all, not a sankey
    // series with empty arrays -- assert on that directly rather than
    // defaulting through optional chaining, which would pass even if
    // `series` were missing for an unrelated reason.
    const option = await getChartOption(page) as SankeyOptionLike | null
    expect(option?.series ?? []).toHaveLength(0)
  })

  // Regression coverage for bck-44j: SankeyView.js renders one discrete
  // graphic.Rect per NODE dataIndex via `nodeData.setItemGraphicEl(node.dataIndex,
  // rect)`, where nodeData is `seriesModel.getData()` -- the series' main
  // `data` array (unique node names), not its `links`. Links/ribbons are a
  // *separate* 'edge' data model (`seriesModel.getData('edge')`) that
  // getSeriesItemScreenPosition's dataIndex-based lookup (against the main
  // data) can't address -- a node is the only tractable hover target here.
  test('hovering a sankey node shows its name and total flow value in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'sankey/Basic.base', viewName: 'User funnel flow (sankey)' })

    await expect.poll(
      async () => {
        const opt = await getChartOption(page) as SankeyOptionLike | null
        return opt?.series?.[0]?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // sankey.ts's `nodes` array is built via flatMap(source, target) +
    // R.unique() over every link row, in Funnel-Step-0..7.md's alphabetical
    // read order -- 'Homepage' (Funnel-Step-0's Source) is the very first
    // name encountered, so it lands at dataIndex 0. Confirmed live rather
    // than trusted by hand-derivation, since dedup order is exactly the
    // kind of detail a transformer change could silently reorder.
    const option = await getChartOption(page) as SankeyOptionLike | null
    const nodeNames = option?.series?.[0]?.data?.map(node => node.name) ?? []
    const dataIndex = nodeNames.indexOf('Homepage')
    expect(dataIndex).toBeGreaterThanOrEqual(0)

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex })

    expect(tooltipText).toContain('Homepage')
    // 'Homepage' only appears as a link Source (Funnel-Step-00.md ->
    // "Product Page": 6500, Funnel-Step-01.md -> "Blog": 3200), so
    // SankeySeriesModel.formatTooltip's node value (the graph layout's
    // summed flow) is 6500 + 3200 = 9700, comma-formatted by ECharts'
    // default tooltip value formatter (see util/format.js's addCommas).
    expect(tooltipText).toContain('9,700')
  })
})
