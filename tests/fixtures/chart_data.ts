import fc from 'fast-check'
import { Temporal } from 'temporal-polyfill'
import * as R from 'remeda'

/**
 * Interface representing a simple data point (x, y).
 */
export interface XYPoint {
  readonly x: number
  readonly y: number
}

/**
 * Interface representing a time-series data point (date, value).
 * Using Temporal.PlainDate or ZonedDateTime for date.
 */
export interface TimePoint {
  readonly date: Temporal.PlainDate | Temporal.ZonedDateTime
  readonly value: number
}

/**
 * Interface representing a generic chart data point (dynamic keys).
 */
export type ChartDataPoint = Record<string, unknown>

export type ChartDataset<T> = readonly T[]

// --- Arbitraries ---

/**
 * Arbitrary for a generic chart data point with specific keys.
 */
export function chartDataPointArbitrary(keys: readonly string[]): fc.Arbitrary<ChartDataPoint> {
  const pairs = keys.map((key): readonly [string, fc.Arbitrary<unknown>] => [
    key,
    fc.oneof(
      fc.integer(),
      fc.float(),
      fc.string(),
      fc.constant(null),
    ),
  ])

  const keyArbs = Object.fromEntries(pairs)
  return fc.record(keyArbs)
}

/**
 * Arbitrary for a dataset (array of points).
 */
// A predicate typed on the parameter union narrows the string-keys branch (and,
// by exclusion, the Arbitrary<T> branch) with no cast at the call site.
function isStringKeyArray<T>(value: fc.Arbitrary<T> | readonly string[]): value is readonly string[] {
  return Array.isArray(value) || Object.prototype.toString.call(value) === '[object Array]'
}

export function chartDatasetArbitrary<T>(
  pointArbitrary: fc.Arbitrary<T> | readonly string[],
  minLength = 0,
  maxLength = 20,
): fc.Arbitrary<ChartDataset<T>> {
  const arb: fc.Arbitrary<T> = isStringKeyArray(pointArbitrary)
    // chartDataPointArbitrary yields Arbitrary<ChartDataPoint>; callers that pass
    // string keys use T = ChartDataPoint, but the generic can't prove that, so
    // this single bridge across the unrelated generic instantiations is unavoidable.
    // eslint-disable-next-line no-restricted-syntax -- fast-check generic bridge: the string-keys branch produces Arbitrary<ChartDataPoint> for T = ChartDataPoint, unprovable through the generic signature.
    ? chartDataPointArbitrary(pointArbitrary) as unknown as fc.Arbitrary<T>
    : pointArbitrary

  return fc.array(
    arb,
    { minLength,
      maxLength },
  )
}

/**
 * Arbitrary for Time Series Data.
 * Generates sorted data by default.
 */

export function timeSeriesArbitrary(): fc.Arbitrary<ChartDataset<TimePoint>> {
  return fc.array(
    fc.record({
      // Generate Temporal ZonedDateTime safely from timestamps (avoiding Date)
      // Restrict range to avoid extreme dates.
      // Using 1970-2099 covers typical use cases.
      date: fc.integer({ min: 0,
        max: 4_102_444_799_000 })
        .map((time) => {
          return Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO('UTC')
        }),
      value: fc.float(),
    }),
    { minLength: 1,
      maxLength: 50 },
  ).map((data) => {
    // Sort safely using Remeda (non-mutating)
    return R.sortBy(
      data,
      item => item.date.epochNanoseconds,
    )
  })
}

// --- Fixed Generators (Deterministic) ---

/**
 * Creates a simple linear dataset.
 */
export function generateLinearData(
  count = 10,
  slope = 1,
  intercept = 0,
): ChartDataset<XYPoint> {
  return Array.from(
    { length: count },
    (_, i) => ({
      x: i,
      y: i * slope + intercept,
    }),
  )
}

/**
 * Creates a sine wave dataset.
 */
export function generateSineData(
  count = 50,
  frequency = 0.1,
  amplitude = 10,
): ChartDataset<XYPoint> {
  return Array.from(
    { length: count },
    (_, i) => ({
      x: i,
      y: Math.sin(i * frequency) * amplitude,
    }),
  )
}

/**
 * Creates a time series with daily increments using Temporal.
 */
export function generateDailyTimeSeries(
  count = 10,
  startDateStr = '2023-01-01',
  startValue = 100,
  volatility = 5,
): ChartDataset<TimePoint> {
  const startDate = Temporal.PlainDate.from(startDateStr)

  return R.range(
    0,
    count,
  ).map((i) => {
    const date = startDate.add({ days: i })
    // Create deterministic pseudo-random value based on index
    const change = Math.sin(i * 1337) * volatility
    const value = startValue + change

    return {
      date,
      value: Number(value.toFixed(2)),
    }
  })
}
