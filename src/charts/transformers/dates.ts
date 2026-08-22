import { Temporal } from 'temporal-polyfill'
import { isRecord, safeToString } from './bases-values'

// Duck-types a native Date (or anything Date-shaped) without importing the
// banned `Date` global as a type -- same pattern as isRenderableValue above.
function isDateLike(val: unknown): val is { readonly getTime: () => number } {
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
