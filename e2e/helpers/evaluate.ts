import type { App } from 'obsidian'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * A cold Obsidian profile (fresh configDir, no persisted metadata cache --
 * true of every e2e Playwright launch) can take longer than 30s to finish
 * indexing/caching frontmatter for the whole example vault before Bases
 * queries resolve, now that the vault contains several large-volume
 * chart-type directories (calendar: 365 notes, heatmap: 168, theme-river:
 * 150). Use this for any expect.poll() that depends on Bases query results
 * resolving (series/indicator/visual data), not just canvas presence.
 *
 * 100s rather than a round 60s or 90s: a clean single run of the
 * sankey-chart rendering test still exceeded a 60_000ms budget on its first
 * attempt (only passed on Playwright's automatic retry), and a full
 * back-to-back run of the whole indexing-sensitive suite produced one more
 * marginal case at 90_000ms -- indexing time is load-sensitive, not a fixed
 * cost. 100s leaves headroom under playwright.config.ts's 120_000ms
 * per-test timeout for the rest of each test's setup/assertions.
 */
export const VAULT_INDEXED_POLL_TIMEOUT_MS = 100_000

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

/**
 * Retrieves the live item count of one series' internal SeriesData model.
 *
 * A dataZoom component with `filterMode: 'filter'` (the default) rebuilds a
 * series' SeriesData with a new, re-numbered index space covering only the
 * in-window rows -- `getItemGraphicEl`/`getSeriesItemScreenPosition` address
 * that filtered index space, not the original row order a static read of
 * `dataset[0].source` would suggest. This count is the reliable way to find
 * a dataIndex that's guaranteed to exist post-filtering (e.g. `count - 1`
 * for the last visible item), confirmed via
 * node_modules/echarts/lib/data/DataStore.js's selectRange, which allocates
 * a fresh 0..count-1 indices array for the selected rows.
 */
export async function getSeriesDataCount(
  page: Page,
  args: { readonly seriesIndex: number },
): Promise<number> {
  return evaluateObsidian(page, (app, a) => {
    interface SeriesDataLike {
      readonly count: () => number
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
    return seriesData?.count() ?? 0
  }, args)
}

/**
 * Waits for the active chart view's ECharts instance to fire its 'finished'
 * event -- ECharts' own signal that the current option has fully rendered,
 * including entrance/update animations. Screenshotting before this fires
 * captures whatever animation frame happened to be on-canvas at that instant,
 * which varies run-to-run even with identical, deterministically-seeded data.
 *
 * Resolves immediately if no chart instance is found. Falls back to
 * `timeoutMs` if 'finished' never fires (e.g. it already fired before this
 * attached), so a stuck render can't hang the caller indefinitely.
 */
export async function waitForChartFinished(page: Page, timeoutMs = 1500): Promise<void> {
  return evaluateObsidian(page, (app, a: { timeoutMs: number }) => {
    interface EChartsInstanceLike {
      readonly on: (event: string, handler: () => void) => void
      readonly off: (event: string, handler: () => void) => void
    }
    interface ChartLike {
      readonly chart: EChartsInstanceLike | null
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

    const chart = chartView?.chart
    if (!chart) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      let settled = false
      const onFinished = () => {
        if (settled) {
          return
        }
        settled = true
        chart.off('finished', onFinished)
        resolve()
      }
      const onTimeout = () => {
        if (settled) {
          return
        }
        settled = true
        chart.off('finished', onFinished)
        resolve()
      }
      chart.on('finished', onFinished)
      setTimeout(onTimeout, a.timeoutMs)
    })
  }, { timeoutMs })
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

/**
 * Waits until Obsidian's MetadataCache has finished resolving every markdown
 * file in the vault -- the same underlying signal a cold e2e launch's
 * "Indexing complete." toast reacts to, and (transitively, via Bases' own
 * listeners) the thing that stops `chart.setOption` from being called again.
 * Position-stability alone isn't a sufficient gate for the hover+tooltip
 * step that follows: an indexing-driven re-render can land at any point,
 * including right as indexing finishes, and resets the tooltip DOM
 * independent of whether a data point's screen position has stopped moving.
 *
 * MetadataCache exposes no synchronous "already resolved" flag, so awaiting
 * the `resolved` event alone can hang: it only fires again for *later* file
 * changes, not for the initial load if that already finished before this
 * function's listener attached. Registering the listener and running the
 * `getCache`-based synchronous check in the same tick (no `await` between
 * them) closes that race -- no event can land in the gap.
 */
export async function waitForVaultIndexed(page: Page, timeoutMs = VAULT_INDEXED_POLL_TIMEOUT_MS): Promise<void> {
  return evaluateObsidian(page, (app, a: { timeoutMs: number }) => {
    const isFullyResolved = () =>
      app.vault.getMarkdownFiles().every(file => app.metadataCache.getCache(file.path) !== null)

    return new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) {
          return
        }
        settled = true
        app.metadataCache.off('resolved', onResolved)
        clearTimeout(timeoutHandle)
        resolve()
      }
      const onResolved = () => {
        if (isFullyResolved()) {
          finish()
        }
      }

      app.metadataCache.on('resolved', onResolved)
      const timeoutHandle = setTimeout(finish, a.timeoutMs)
      if (isFullyResolved()) {
        finish()
      }
    })
  }, { timeoutMs })
}

export interface ScreenPosition {
  readonly pageX: number
  readonly pageY: number
}

/**
 * Finds the on-screen center of a rendered data point's shape (bar, point,
 * slice, node, etc.) via ECharts' internal `getItemGraphicEl` -- the same
 * bounding-box primitive ECharts' own TooltipView uses to position a
 * manually-triggered tooltip. Returns null until that series/dataIndex's
 * graphic element has actually rendered, which can lag behind canvas
 * presence -- poll with `expect.poll` (see `hoverChartDataPointAndGetTooltip`)
 * rather than assuming a single call right after the chart mounts succeeds.
 *
 * Verified reliable for discrete-shape series (bar, scatter/effect-scatter,
 * pie-family) where each dataIndex is one drawable shape, and (as of the
 * ignore/invisible filtering below, plus the vault-indexed wait and
 * position-stability poll in `hoverChartDataPointAndGetTooltip`) for
 * zrender-Group-based series where one dataIndex renders as several
 * sub-elements, confirmed via radar.
 */
export async function getSeriesItemScreenPosition(
  page: Page,
  args: { readonly seriesIndex: number, readonly dataIndex: number },
): Promise<ScreenPosition | null> {
  return evaluateObsidian(page, (app, a) => {
    interface BoundingRect { readonly x: number, readonly y: number, readonly width: number, readonly height: number }
    interface GraphicElLike {
      readonly type?: string
      readonly getBoundingRect?: () => BoundingRect
      // zrender's Transformable#updateTransform composes each element's local
      // matrix with its parent's during render, so by the time an element is
      // actually on-screen this 6-value affine matrix ([a,b,c,d,e,f], applied
      // as x'=a*x+c*y+e, y'=b*x+d*y+f) is already the full local-to-global
      // transform -- not just this element's own local one. Required for
      // anything nested inside a rotated/translated group (polar coordinate
      // systems: radar, rose, polar-line/scatter, radial-bar, sunburst), where
      // the raw bounding rect alone (cartesian bars' common case) is off.
      readonly transform?: readonly [number, number, number, number, number, number]
      // Present on zrender Group elements (e.g. radar/parallel: one whole
      // multi-vertex shape per dataIndex, grouping its outline path plus a
      // sub-group of small per-vertex symbol dots).
      readonly childCount?: () => number
      readonly childAt?: (idx: number) => GraphicElLike | undefined
      // zrender's own raycast (Displayable#contain) skips an element (and
      // everything under it) when either is set -- e.g. radar's polygon has
      // `ignore = true` whenever no areaStyle is configured, since an unfilled
      // polygon has nothing to paint. A bounding-rect center inside an
      // ignored/invisible shape will never register a real mouse hit, so it
      // must be excluded rather than left to lose the smallest-area tie-break
      // by coincidence.
      readonly ignore?: boolean
      readonly invisible?: boolean
    }

    interface LeafShape extends GraphicElLike {
      readonly getBoundingRect: () => BoundingRect
    }

    function hasBoundingRect(candidate: GraphicElLike): candidate is LeafShape {
      return typeof candidate.getBoundingRect === 'function'
    }

    function isHitTestable(candidate: GraphicElLike): boolean {
      return candidate.ignore !== true && candidate.invisible !== true
    }

    // getItemGraphicEl can return a zrender Group rather than a single drawable
    // shape (true for radar/parallel, where one dataIndex is a whole
    // multi-point shape, not a discrete per-point mark). A group's own
    // aggregate bounding-rect center is frequently empty space -- e.g. a
    // radar polygon with no areaStyle is hollow, so its visual center hits
    // nothing. Recurse to the actual hit-testable leaf shapes and hover the
    // smallest one: small leaves are the individual point/symbol marks; large
    // ones (the connecting polyline/polygon outline) span the whole shape and
    // are much more likely to have an empty center.
    function collectLeafShapes(candidate: GraphicElLike): readonly LeafShape[] {
      if (!isHitTestable(candidate)) {
        return []
      }
      const count = candidate.childCount ? candidate.childCount() : 0
      if (count === 0) {
        return hasBoundingRect(candidate) ? [candidate] : []
      }
      return Array.from({ length: count }, (_, i) => candidate.childAt?.(i))
        .filter((child): child is GraphicElLike => child !== undefined)
        .flatMap(collectLeafShapes)
    }

    function smallestLeafShape(candidate: GraphicElLike): GraphicElLike {
      const leafShapes = collectLeafShapes(candidate)
      return leafShapes.length === 0
        ? candidate
        : leafShapes.reduce((smallest, next) => {
            const smallestRect = smallest.getBoundingRect()
            const nextRect = next.getBoundingRect()
            return (nextRect.width * nextRect.height) < (smallestRect.width * smallestRect.height) ? next : smallest
          })
    }
    interface SeriesDataLike {
      readonly getItemGraphicEl: (idx: number) => GraphicElLike | undefined
    }
    interface SeriesModelLike {
      readonly getData: () => SeriesDataLike
    }
    interface EChartsModelLike {
      readonly getSeriesByIndex: (index: number) => SeriesModelLike | undefined
    }
    interface ChartLike {
      readonly chart: {
        readonly getModel: () => EChartsModelLike
        readonly getDom: () => HTMLElement
      } | null
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

    const chart = chartView?.chart
    if (!chart) {
      return null
    }

    const el = chart.getModel().getSeriesByIndex(a.seriesIndex)?.getData().getItemGraphicEl(a.dataIndex)
    if (!el || !hasBoundingRect(el)) {
      return null
    }
    const target = smallestLeafShape(el)
    if (!hasBoundingRect(target)) {
      return null
    }

    const rect = target.getBoundingRect()
    const localCenterX = rect.x + rect.width / 2
    const localCenterY = rect.y + rect.height / 2

    const [m0, m1, m2, m3, m4, m5] = target.transform ?? [1, 0, 0, 1, 0, 0]
    const globalX = m0 * localCenterX + m2 * localCenterY + m4
    const globalY = m1 * localCenterX + m3 * localCenterY + m5

    const domRect = chart.getDom().getBoundingClientRect()
    return {
      pageX: domRect.left + globalX,
      pageY: domRect.top + globalY,
    }
  }, args)
}

/**
 * Reads ECharts' tooltip DOM node's rendered text content, if currently
 * visible. ECharts appends the tooltip element inside the chart's own root
 * container (`api.getDom()`), not `document.body`, and gives it no default
 * className -- it's identifiable only via a `domBelongToZr` JS property set
 * by TooltipHTMLContent. Returns null while hidden/empty.
 *
 * Concatenates every matching div rather than taking the first: a chart with
 * `axisPointer: { type: 'cross' }` (e.g. candlestick) renders a separate
 * small crosshair-value label alongside the main tooltip box, both marked
 * `domBelongToZr` -- taking only the first one risks reading just the
 * crosshair label instead of (or as well as) the actual tooltip content,
 * confirmed via a live run truncating candlestick's OHLC tooltip down to a
 * single axis value.
 */
export async function getTooltipText(page: Page): Promise<string | null> {
  return evaluateObsidian(page, () => {
    const isZrOwnedDiv = (el: Element): el is Element & { readonly domBelongToZr: boolean } =>
      'domBelongToZr' in el && el.domBelongToZr === true

    const chartRoot = document.querySelector('.bases-echarts')
    if (!chartRoot) {
      return null
    }
    const text = Array.from(chartRoot.querySelectorAll('div'))
      .filter(isZrOwnedDiv)
      .map(el => el.textContent ?? '')
      .join(' ')
    return text.length > 0 ? text : null
  })
}

/**
 * Moves the real (OS-level) mouse over a specific data point's rendered
 * shape and returns the tooltip text that appears.
 *
 * Uses a genuine `page.mouse.move` rather than
 * `chart.dispatchAction({type: 'showTip', seriesIndex, dataIndex})` --
 * confirmed empirically that the dispatchAction path silently no-ops for
 * axis-triggered tooltips (bar/line/area) whenever the chart doesn't
 * explicitly configure an `axisPointer` component, since ECharts'
 * `_manuallyAxisShowTip` requires `ecModel.getComponent('axisPointer')` to
 * already exist. A real mouse hover exercises the exact same hit-testing
 * code path a user's pointer does, regardless of trigger/axisPointer config,
 * so it works uniformly across every chart type.
 *
 * Waits for the target position to stabilize before hovering, not just for
 * the graphic element to exist: `data.setItemGraphicEl` runs -- making
 * `getSeriesItemScreenPosition` resolve -- as soon as ECharts starts
 * rendering a data item, before its entrance animation completes. Bases can
 * also call `chart.setOption` more than once as vault indexing catches up
 * (an early render of incomplete/empty data, then a later one with the real
 * data), and each `setOption` restarts the affected items' entrance
 * animation -- so even waiting for one `chart.on('finished', ...)` event
 * isn't reliable, since it may fire after an earlier, irrelevant render. For
 * a bar chart's grow-upward animation an in-flight sample is harmless -- a
 * point sampled mid-animation still ends up inside the taller final bar. For
 * radar it isn't: every point starts collapsed at the polar center and
 * animates outward, so an early sample lands nowhere near the settled vertex
 * symbol. Sampling the position repeatedly and waiting for it to stop moving
 * is correct regardless of how many render/animation passes happen.
 */
export async function hoverChartDataPointAndGetTooltip(
  page: Page,
  args: { readonly seriesIndex: number, readonly dataIndex: number },
  // Playwright's page.mouse.move sends a single instantaneous mousemove by
  // default (no intermediate events). That's sufficient to trigger every
  // trigger:'item' and cartesian trigger:'axis' tooltip in this codebase,
  // but polar-line's trigger:'axis' + coordinateSystem:'polar' combination
  // (the only one of its kind here) never showed a tooltip at all from a
  // single jump in live runs, and reliably did once the move was broken into
  // multiple intermediate mousemove events -- polar's axis-pointer angle
  // resolution appears to need a real, gradual pointer path rather than a
  // teleport. Defaults to a single move (unchanged behavior for every other
  // caller); pass a higher value only for chart types that need it.
  moveSteps = 1,
): Promise<string> {
  // Wait out indexing-driven re-renders before measuring anything: once the
  // vault is fully resolved, Bases has no further reason to call
  // `chart.setOption` on its own, so the position-stability and tooltip
  // polls below are no longer racing against a re-render that could land at
  // any moment.
  await waitForVaultIndexed(page)

  await expect.poll(
    () => getSeriesItemScreenPosition(page, args),
    { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
  ).not.toBeNull()

  let previous: ScreenPosition | null = null
  await expect.poll(async () => {
    const current = await getSeriesItemScreenPosition(page, args)
    const stable = current !== null && previous !== null
      && Math.abs(current.pageX - previous.pageX) < 0.5
      && Math.abs(current.pageY - previous.pageY) < 0.5
    previous = current
    return stable
  // Same VAULT_INDEXED_POLL_TIMEOUT_MS budget as the existence poll above,
  // not a short fixed window -- confirmed via a live failure screenshot that
  // Obsidian's "Indexing vault..." banner was still active when a 5000ms
  // budget ran out, meaning Bases can still be restarting entrance
  // animations via repeated setOption calls well past 5s in a loaded
  // environment.
  }, { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS, intervals: [100] }).toBe(true)

  const target = await getSeriesItemScreenPosition(page, args)
  if (!target) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`no rendered graphic element for seriesIndex=${args.seriesIndex} dataIndex=${args.dataIndex} even after polling succeeded`)
  }
  await page.mouse.move(target.pageX, target.pageY, { steps: moveSteps })

  await expect.poll(
    () => getTooltipText(page),
    { timeout: 5000 },
  ).not.toBeNull()

  const text = await getTooltipText(page)
  if (text === null) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error('tooltip text was null immediately after a poll confirmed it was non-null')
  }
  return text
}
