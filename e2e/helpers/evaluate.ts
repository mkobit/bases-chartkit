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
      if (!('getChartOption' in obj) || !('chart' in obj)) {
        return false
      }
      return typeof obj.getChartOption === 'function' && obj.chart !== undefined
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
      // Object.values(o: {}) resolves to `any[]`, not `unknown[]` -- there's
      // no index-signature overload for a plain, non-indexed object type.
      // Annotating immediately contains that `any` leak instead of letting it
      // propagate through the rest of the traversal.
      const values: readonly unknown[] = Object.values(obj)
      return values
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
      if (!('getChartOption' in obj) || !('chart' in obj)) {
        return false
      }
      return typeof obj.getChartOption === 'function' && obj.chart !== undefined
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
      // Object.values(o: {}) resolves to `any[]`, not `unknown[]` -- there's
      // no index-signature overload for a plain, non-indexed object type.
      // Annotating immediately contains that `any` leak instead of letting it
      // propagate through the rest of the traversal.
      const values: readonly unknown[] = Object.values(obj)
      return values
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

export interface MapSeriesState {
  readonly subType: string | undefined
  readonly mapName: string | undefined
  readonly regionNames: ReadonlyArray<string>
  readonly items: ReadonlyArray<{ readonly name: string, readonly value: number | null }>
}

/**
 * Retrieves the live-rendered state of a map-type series: its registered map
 * name, the resolved geo coordinate system's region names, and each data
 * item's name/value as ECharts' SeriesData model actually holds them.
 *
 * Region names and item values are only known post-registration:
 * `echarts.registerMap` parses the GeoJSON asset asynchronously, and the
 * coordinate system's region list is built from the *actual* features in
 * that file -- not from the transformer's static `data` array. A missing or
 * malformed map asset, or a `regionProp` value that doesn't match any real
 * feature name, is invisible to unit tests (which only assert on the static
 * option object) but shows up here as an absent/incomplete region list.
 */
export async function getMapSeriesState(
  page: Page,
  args: { readonly seriesIndex: number },
): Promise<MapSeriesState | null> {
  return evaluateObsidian(page, (app, a) => {
    interface GeoRegionLike {
      readonly name: string
    }
    interface SeriesDataLike {
      readonly count: () => number
      readonly getName: (idx: number) => string
      readonly get: (dimension: string, idx: number) => unknown
    }
    interface SeriesModelLike {
      readonly subType?: unknown
      readonly get: (key: string) => unknown
      readonly getData: () => SeriesDataLike
      readonly coordinateSystem?: { readonly regions?: readonly GeoRegionLike[] }
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
      if (!('getChartOption' in obj) || !('chart' in obj)) {
        return false
      }
      return typeof obj.getChartOption === 'function' && obj.chart !== undefined
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
      // Object.values(o: {}) resolves to `any[]`, not `unknown[]` -- there's
      // no index-signature overload for a plain, non-indexed object type.
      // Annotating immediately contains that `any` leak instead of letting it
      // propagate through the rest of the traversal.
      const values: readonly unknown[] = Object.values(obj)
      return values
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

    const series = chartView?.chart?.getModel().getSeriesByIndex(a.seriesIndex)
    if (!series) {
      return null
    }

    const seriesData = series.getData()
    const items = Array.from({ length: seriesData.count() }, (_, idx) => {
      const rawValue = seriesData.get('value', idx)
      return {
        name: seriesData.getName(idx),
        value: typeof rawValue === 'number' && !Number.isNaN(rawValue) ? rawValue : null,
      }
    })

    const mapNameRaw = series.get('map')
    const subTypeRaw = series.subType

    return {
      subType: typeof subTypeRaw === 'string' ? subTypeRaw : undefined,
      mapName: typeof mapNameRaw === 'string' ? mapNameRaw : undefined,
      regionNames: series.coordinateSystem?.regions?.map(region => region.name) ?? [],
      items,
    }
  }, args)
}
