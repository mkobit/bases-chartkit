import type { EChartsOption, LegendComponentOption, TitleComponentOption } from 'echarts'
import { Temporal } from 'temporal-polyfill'
import type { BaseTransformerOptions } from './base'

// Obsidian's BasesNote#get() returns a `Value` wrapper (e.g.
// `{ icon: 'lucide-calendar', date: Date, time: false }` or
// `{ icon: 'lucide-binary', data: 3503 }`), not the raw property value.
// It duck-types as a record with a `renderTo` method (used internally by
// Obsidian to paint the value into the DOM) whose `toString()` produces the
// correctly formatted display text — unlike JSON.stringify, which dumps the
// wrapper's internal shape verbatim.
function isRenderableValue(
  o: Record<string, unknown>,
): o is Record<string, unknown> & { readonly toString: () => string } {
  return typeof o.renderTo === 'function'
}

export function safeToString(val: unknown): string {
  if (val === null || val === undefined) {
    return ''
  }
  if (typeof val === 'string') {
    return val
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val)
  }
  if (isRecord(val) && isRenderableValue(val)) {
    const rendered = val.toString()
    // A note that matches the base's filter but was never given this
    // property surfaces as Obsidian's `NullValue` sentinel -- a Value wrapper
    // like any other, but its `toString()` renders the literal text "null"
    // rather than an empty string. Treat that placeholder as absent so it
    // doesn't leak into chart labels/categories as a bogus "null" entry.
    return rendered === 'null' ? '' : rendered
  }
  return JSON.stringify(val)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Obsidian's BasesView passes data items whose `note` (and similar) fields
// are class instances (e.g. `BasesNote`) — properties are accessed via
// `.get(key)`, NOT direct property access. We duck-type that: when direct
// access fails, fall back to a `.get(key)` accessor if one exists.
function isRecordWithGetAccessor(
  o: Record<string, unknown>,
): o is Record<string, unknown> & { readonly get: (key: string) => unknown } {
  return typeof o.get === 'function'
}

// A Bases data row (BasesEntry) resolves any property id -- note.*, file.*,
// and crucially formula.* -- through a single getValue(propertyId) evaluator.
function isRecordWithGetValueAccessor(
  o: Record<string, unknown>,
): o is Record<string, unknown> & { readonly getValue: (id: string) => unknown } {
  return typeof o.getValue === 'function'
}

export function getNestedValue(obj: unknown, path: string): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return undefined
  }
  // Bases formula results (`formula.<name>`) are computed lazily and are NOT
  // reachable by dot-walking the entry the way `note.*`/`file.*` fields are --
  // they're only exposed via the entry's own getValue(propertyId) evaluator,
  // which also runs the formula. Verified live (bck-g79): dot-walking
  // formula.* yields undefined -> a bogus "Unknown" category, while
  // entry.getValue('formula.FormattedDate') returns the evaluated value. Gated
  // to the `formula.` prefix so note.*/file.* keep their existing direct-access
  // path (and its handling of genuinely-absent props) unchanged.
  if (path.startsWith('formula.') && isRecord(obj) && isRecordWithGetValueAccessor(obj)) {
    return obj.getValue(path)
  }
  return path.split('.').reduce(
    (o: unknown, key: string): unknown => {
      if (!isRecord(o)) {
        return undefined
      }
      const direct = key in o ? o[key] : undefined
      return direct !== undefined
        ? direct
        : isRecordWithGetAccessor(o) ? o.get(key) : undefined
    },
    obj,
  )
}

// Beyond this many categories, forcing every x-axis label to render
// (axisLabel.interval: 0) reliably overlaps into illegible, garbled text --
// switch to ECharts' own overlap-avoiding auto-thinning instead, the same
// way compact/mobile layouts already do.
const MANY_CATEGORIES_THRESHOLD = 15

export interface AxisLabelOverlapOptions {
  readonly interval: 0 | 'auto'
  readonly rotate: number
}

// For a cartesian axis that renders one label per category: avoid overlap on
// many-point series without regressing the "show every label" behavior for
// short ones.
export function getAxisLabelOverlapOptions(
  categoryCount: number,
  isCompact: boolean,
  explicitRotate: number | undefined,
  flipAxis: boolean,
): AxisLabelOverlapOptions {
  const needsThinning = isCompact || categoryCount > MANY_CATEGORIES_THRESHOLD
  return {
    interval: needsThinning ? 'auto' : 0,
    rotate: explicitRotate ?? (needsThinning && !flipAxis ? 45 : 0),
  }
}

const compactNumberFormatter = new Intl.NumberFormat(
  undefined,
  { notation: 'compact',
    maximumFractionDigits: 1 },
)

// Abbreviates large numeric visualMap min/max handle labels (e.g. GDP
// figures like 6994402 -> "7M") so they stay short enough not to overlap
// each other or the axis labels below. ECharts calls this with a single raw
// handle value (see VisualMapModel#formatValueText), typed OptionDataValue
// rather than plain number, hence the runtime narrow instead of a `number`
// parameter.
export function formatCompactVisualMapLabel(value: unknown): string {
  return typeof value === 'number' ? compactNumberFormatter.format(value) : String(value)
}

// Duck-types a native Date (or anything Date-shaped) without importing the
// banned `Date` global as a type -- same pattern as isRenderableValue above.
function isDateLike(val: unknown): val is { getTime: () => number } {
  return typeof val === 'object' && val !== null && 'getTime' in val && typeof val.getTime === 'function'
}

// Parses a raw Bases property value (number, native Date, Value-wrapper, or
// date/instant string) into epoch milliseconds via the Temporal API per
// AGENTS.md, returning null for anything that isn't a real, parseable date --
// callers filter those rows out instead of handing ECharts an unparseable
// value with no diagnostic.
export function parseDateToEpochMs(val: unknown): number | null {
  if (typeof val === 'number') {
    return val
  }
  if (isDateLike(val)) {
    return val.getTime()
  }
  // Bases' Value wrapper for date properties isn't a string or a native
  // Date — unwrap it via safeToString (-> ISO date string) before parsing,
  // or Temporal.Instant/PlainDate always throw.
  const str = typeof val === 'string' ? val : isRecord(val) ? safeToString(val) : null
  if (str === null) {
    return null
  }
  try {
    return Temporal.Instant.from(str).epochMilliseconds
  }
  catch {
    try {
      return Temporal.PlainDate.from(str).toZonedDateTime('UTC').epochMilliseconds
    }
    catch {
      return null
    }
  }
}

export function getLegendOption(options?: BaseTransformerOptions): Readonly<LegendComponentOption> | undefined {
  const showLegend = options?.legend ?? false

  const isCompact = (options?.isMobile ?? false) || (options?.containerWidth !== undefined && options.containerWidth < 600)
  const defaultPosition = isCompact ? 'bottom' : 'top'
  const position = options?.legendPosition || defaultPosition

  const defaultOrient = (position === 'left' || position === 'right') ? 'vertical' : 'horizontal'
  const orient = options?.legendOrient ?? defaultOrient

  // eslint-disable-next-line functional/prefer-immutable-types -- LegendComponentOption is a union type alias (LegendOption | ScrollableLegendOption); Readonly<> wrapping a union loses the alias identity the ignoreTypePattern name match relies on (bd memory: prefer-immutable-types-union-option-alias-gap).
  const base: Readonly<LegendComponentOption> = {
    orient,
    type: 'scroll',
  }

  const positionMap: Readonly<Record<string, Readonly<LegendComponentOption>>> = {
    bottom: { bottom: 0,
      left: 'center' },
    left: { left: 0,
      top: 'middle' },
    right: { right: 0,
      top: 'middle' },
    top: { top: 0,
      left: 'center' },
  }

  const posConfig = positionMap[position] ?? positionMap['top']

  return showLegend

    ? { ...base,
        ...posConfig }
    : undefined
}

type TooltipFormatterFn = NonNullable<EChartsOption['tooltip']> extends { formatter?: infer F } ? F : never

// ECharts' `tooltip.formatter` option type is a broad union covering every
// trigger/chart shape it supports. Chart-specific tooltip formatters written
// against a transformer's own narrower params type (single object for
// trigger:'item', array for trigger:'axis') need to bridge to that broader
// type at the assignment site -- centralizing the bridge here means the cast
// (and its lint exemption) exists in one place instead of once per chart.
export function asTooltipFormatter<P>(fn: (params: P) => string): TooltipFormatterFn {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-restricted-syntax -- see comment above; ECharts' own formatter type can't be narrowed from a generic chart-specific function type without a bridging cast.
  return fn as unknown as TooltipFormatterFn
}

export function getTitleOption(options?: BaseTransformerOptions): Readonly<TitleComponentOption> | undefined {
  const text = options?.title
  const subtext = options?.description

  if (!text && !subtext) {
    return undefined
  }

  const title: Readonly<TitleComponentOption> = {
    ...(text ? { text } : {}),
    ...(subtext ? { subtext } : {}),
    left: 'left',
    top: 0,
  }

  return title
}
