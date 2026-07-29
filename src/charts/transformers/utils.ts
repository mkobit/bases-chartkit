import type { LegendComponentOption } from 'echarts'
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

export function getNestedValue(obj: unknown, path: string): unknown {
  return (typeof obj !== 'object' || obj === null)
    ? undefined
    : path.split('.').reduce(
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

// Parses a raw Bases property value (number, native Date, Value-wrapper, or
// date/instant string) into epoch milliseconds via the Temporal API per
// AGENTS.md, returning null for anything that isn't a real, parseable date --
// callers filter those rows out instead of handing ECharts an unparseable
// value with no diagnostic.
export function parseDateToEpochMs(val: unknown): number | null {
  if (typeof val === 'number') {
    return val
  }
  if (val && typeof val === 'object' && 'getTime' in val && typeof val.getTime === 'function') {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- already narrowed via the 'getTime' in val + typeof check above
    return (val as { getTime: () => number }).getTime()
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
