import type { App } from 'obsidian'
import type { Page } from '@playwright/test'

// Unified runner: evaluates `fn` inside the Obsidian renderer. When `args` is
// omitted the function receives only `app`. Args must be JSON-serializable
// since they're shipped over CDP.
export async function evaluateObsidian<T>(
  page: Page,
  fn: (app: App) => T | Promise<T>,
): Promise<T>
export async function evaluateObsidian<T, A>(
  page: Page,
  fn: (app: App, args: A) => T | Promise<T>,
  args: A,
): Promise<T>
export async function evaluateObsidian<T, A>(
  page: Page,
  fn: ((app: App) => T | Promise<T>) | ((app: App, args: A) => T | Promise<T>),
  args?: A,
): Promise<T> {
  const fnSrc = fn.toString()
  return page.evaluate(([src, fnArgs]) => {
    const fnObj = new Function(`return (${src})`)() as (app: App, a?: unknown) => T | Promise<T>
    const obsidianApp = (activeWindow as Window & { app: App }).app
    return fnObj(obsidianApp, fnArgs)
  }, [fnSrc, args] as const)
}

/**
 * Retrieves the ECharts Option object from the active Bases chart view or any loaded chart view.
 * This reads the live options configured on the actual ECharts instance.
 */
export async function getChartOption(page: Page): Promise<unknown> {
  return evaluateObsidian(page, (app) => {
    interface ChartLike {
      readonly chart: { readonly getOption: () => unknown } | null
    }

    const isChartView = (obj: unknown): obj is ChartLike => {
      if (obj === null || typeof obj !== 'object') {
        return false
      }
      const candidate = obj as Record<string, unknown>
      const chart = candidate.chart as Record<string, unknown> | null | undefined
      return typeof candidate.getChartOption === 'function' && chart !== undefined
    }

    const findChartView = (obj: unknown, depth: number, visited: readonly unknown[]): ChartLike | undefined => {
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
      return Object.values(obj as Record<string, unknown>)
        .map(value => findChartView(value, depth + 1, nextVisited))
        .find((found): found is ChartLike => found !== undefined)
    }

    const leaves = [
      app.workspace.getLeaf(false),
      ...app.workspace.getLeavesOfType('bases'),
    ]

    const chartView = leaves
      .map(leaf => leaf ? findChartView(leaf.view, 0, []) : undefined)
      .find((view): view is ChartLike => view !== undefined)

    return chartView?.chart?.getOption() ?? null
  })
}

/**
 * Retrieves the resolved per-item visual values (e.g. 'symbolSize') for every
 * data point in one series of the active Bases chart view.
 *
 * Unlike getChartOption, this reads ECharts' internal visual-encoding model —
 * the values actually used to draw each point after any visualMap mapping or
 * per-item callback (e.g. symbolSize) has been applied — rather than the
 * static option object a transformer produced.
 */
export async function getSeriesVisualValues(
  page: Page,
  args: { readonly seriesIndex: number, readonly visualKey: string },
): Promise<ReadonlyArray<unknown>> {
  return evaluateObsidian(page, (app, a) => {
    interface SeriesDataLike {
      readonly count: () => number
      readonly getItemVisual: (idx: number, key: string) => unknown
    }
    interface SeriesModelLike {
      readonly getData: () => SeriesDataLike
    }
    interface EChartsModelLike {
      readonly getSeriesByIndex: (index: number) => SeriesModelLike | undefined
    }
    interface ChartLike {
      readonly chart: { readonly getModel: () => EChartsModelLike } | null
    }

    const isChartView = (obj: unknown): obj is ChartLike => {
      if (obj === null || typeof obj !== 'object') {
        return false
      }
      const candidate = obj as Record<string, unknown>
      const chart = candidate.chart as Record<string, unknown> | null | undefined
      return typeof candidate.getChartOption === 'function' && chart !== undefined
    }

    const findChartView = (obj: unknown, depth: number, visited: readonly unknown[]): ChartLike | undefined => {
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
      return Object.values(obj as Record<string, unknown>)
        .map(value => findChartView(value, depth + 1, nextVisited))
        .find((found): found is ChartLike => found !== undefined)
    }

    const leaves = [
      app.workspace.getLeaf(false),
      ...app.workspace.getLeavesOfType('bases'),
    ]

    const chartView = leaves
      .map(leaf => leaf ? findChartView(leaf.view, 0, []) : undefined)
      .find((view): view is ChartLike => view !== undefined)

    const seriesData = chartView?.chart?.getModel().getSeriesByIndex(a.seriesIndex)?.getData()
    if (!seriesData) {
      return []
    }
    return Array.from({ length: seriesData.count() }, (_, idx) => seriesData.getItemVisual(idx, a.visualKey))
  }, args)
}
