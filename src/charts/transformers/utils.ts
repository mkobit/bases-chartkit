import type { LegendComponentOption } from 'echarts'
import type { BaseTransformerOptions } from './base'

export function safeToString(val: unknown): string {
  return val === null || val === undefined
    ? ''
    : typeof val === 'string'
      ? val
      : typeof val === 'number' || typeof val === 'boolean'
        ? String(val)
        : JSON.stringify(val)
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
