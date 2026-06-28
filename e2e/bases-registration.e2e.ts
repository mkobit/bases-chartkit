import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian } from './helpers/evaluate'
import type { App } from 'obsidian'

const EXPECTED_CHART_VIEW_TYPES = [
  'area-chart',
  'bar-chart',
  'boxplot-chart',
  'bubble-chart',
  'bullet-chart',
  'calendar-chart',
  'candlestick-chart',
  'effect-scatter-chart',
  'funnel-chart',
  'gantt-chart',
  'gauge-chart',
  'graph-chart',
  'heatmap-chart',
  'histogram-chart',
  'line-chart',
  'lines-chart',
  'map-chart',
  'parallel-chart',
  'pareto-chart',
  'pictorial-bar-chart',
  'pie-chart',
  'polar-bar-chart',
  'polar-line-chart',
  'polar-scatter-chart',
  'radar-chart',
  'radial-bar-chart',
  'rose-chart',
  'sankey-chart',
  'scatter-chart',
  'stacked-bar-chart',
  'sunburst-chart',
  'theme-river-chart',
  'tree-chart',
  'treemap-chart',
  'waterfall-chart',
  'word-cloud-chart',
] as const

test.describe('Bases view registration', () => {
  test('plugin registers all chart view types with the Bases core plugin', async ({ obsidianPage: { page } }) => {
    const registeredViews = await evaluateObsidian(page, (app: App) => {
      const internal = app as unknown as {
        internalPlugins: { plugins: Record<string, { instance?: { registrations?: Record<string, unknown> } }> }
      }
      const registrations = internal.internalPlugins.plugins.bases?.instance?.registrations
      return registrations ? Object.keys(registrations).sort() : []
    })

    const missing = EXPECTED_CHART_VIEW_TYPES.filter(t => !registeredViews.includes(t))
    expect(missing).toEqual([])
  })
})
