import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian } from './helpers/evaluate'

test.describe('tree chart async data update', () => {
  // Regression test for obsidian-bases-charts-fs4.3: Bases resolves its query
  // asynchronously, so the tree-chart view's first render often mounts before
  // any rows arrive. ECharts' `tree` series throws internally
  // ("Cannot read properties of null (reading '0')") when a later `setOption`
  // transitions away from that empty first render, because it tries to
  // reconcile expand/collapse view-state against a previous render that had
  // no root node -- silently freezing the chart on a blank/empty state
  // forever. TreeChartView.executeRender() now clears the chart before every
  // render to avoid the stale diffing state.
  test('renders the full hierarchy once Bases data resolves, not just the empty first paint', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'Project_Management.base', viewName: 'Project Tasks Tree' })

    await expect.poll(async () => evaluateObsidian(page, () => {
      // The tree-chart view is nested inside Bases' own container view, at a
      // depth that isn't part of any public API. Walk the object graph
      // looking for the instance with a `getChartOption` method (our
      // BaseChartView subclass) rather than hardcoding child indices.
      interface ChartLike {
        chart: { getOption: () => { series?: readonly { data?: readonly unknown[] }[] } }
      }

      function isChartView(obj: unknown): obj is ChartLike {
        if (obj === null || typeof obj !== 'object') {
          return false
        }
        const candidate = obj as Record<string, unknown>
        const chart = candidate.chart as Record<string, unknown> | undefined
        return typeof candidate.getChartOption === 'function' && typeof chart?.getOption === 'function'
      }

      function findChartView(obj: unknown, depth: number, visited: readonly unknown[]): ChartLike | undefined {
        if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
          return undefined
        }
        if (depth > 8 || visited.includes(obj)) {
          return undefined
        }
        if (isChartView(obj)) {
          return obj
        }
        const nextVisited = [...visited, obj]
        for (const value of Object.values(obj as Record<string, unknown>)) {
          const found = findChartView(value, depth + 1, nextVisited)
          if (found) {
            return found
          }
        }
        return undefined
      }

      const activeLeafView = app.workspace.getLeaf(false).view
      const chartView = findChartView(activeLeafView, 0, [])
      const option = chartView?.chart.getOption()
      return option?.series?.[0]?.data?.length ?? 0
    }), { timeout: 15_000 }).toBeGreaterThan(0)
  })
})
