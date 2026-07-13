import type { LegendComponentOption } from 'echarts'
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
    // isRenderableValue narrows toString to `() => string`, but the rule's
    // type resolution doesn't see through the Record<string, unknown> intersection.

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

export function getLegendOption(options?: BaseTransformerOptions): Readonly<LegendComponentOption> | undefined {
  const showLegend = options?.legend ?? false

  // Smart Default Position
  const isCompact = (options?.isMobile ?? false) || (options?.containerWidth !== undefined && options.containerWidth < 600)
  const defaultPosition = isCompact ? 'bottom' : 'top'

  // Use user-specified position, or fall back to smart default
  // Note: We check if options.legendPosition is truthy/defined.
  // If undefined, we use defaultPosition.
  const position = options?.legendPosition || defaultPosition

  // Default orient based on position if not set
  // Left/Right -> Vertical
  // Top/Bottom -> Horizontal
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
