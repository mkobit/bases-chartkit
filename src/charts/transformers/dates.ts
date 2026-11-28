import { isRecord, safeToString } from './bases-values'

// Maximum epoch millisecond magnitude supported by Temporal.Instant and
// ECMAScript Date (±100,000,000 days from the Unix epoch).
const MAX_EPOCH_MS = 8_640_000_000_000_000

// Validates that a numeric timestamp is a finite, in-range integer number of
// epoch milliseconds accepted by Temporal.Instant.fromEpochMilliseconds().
// Fractional values are rejected (returning null) rather than truncated.
function validateEpochMs(ms: number): number | null {
  if (!Number.isFinite(ms) || !Number.isInteger(ms) || ms < -MAX_EPOCH_MS || ms > MAX_EPOCH_MS) {
    return null
  }
  return ms === 0 ? 0 : ms
}

// Duck-types a native Date (or anything Date-shaped) without importing the
// banned `Date` global as a type -- same pattern as isRenderableValue above.
function isDateLike(val: unknown): val is { readonly getTime: () => number } {
  return (
    typeof val === 'object' && val !== null && 'getTime' in val && typeof val.getTime === 'function'
  )
}

// Parses a raw Bases property value (number, native Date, Value-wrapper, or
// date/instant string) into epoch milliseconds via the Temporal API per
// AGENTS.md, returning null for anything that isn't a real, parseable date --
// callers filter those rows out instead of handing ECharts an unparseable
// value with no diagnostic.
// Numeric inputs (and Date-like getTime() values) must be finite, in-range
// (±8.64e15 ms) integer epoch milliseconds; fractional values return null.
export function parseDateToEpochMs(val: unknown): number | null {
  if (typeof val === 'number') {
    return validateEpochMs(val)
  }
  if (isDateLike(val)) {
    return validateEpochMs(val.getTime())
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
  } catch {
    try {
      return Temporal.PlainDateTime.from(str).toZonedDateTime('UTC').epochMilliseconds
    } catch {
      try {
        return Temporal.PlainDate.from(str).toZonedDateTime('UTC').epochMilliseconds
      } catch {
        return null
      }
    }
  }
}
