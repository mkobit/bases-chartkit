import * as fc from 'fast-check'
import * as R from 'remeda'
import { REGIONS } from './themes'

// Fixed rather than Temporal.Now.plainDateISO() -- a wall-clock anchor made
// this arbitrary non-deterministic across days despite the seeded sampling,
// defeating the whole point of `getDeterministicSample`.
const ANCHOR_DATE = Temporal.PlainDate.from('2024-01-31')

/**
 * Arbitrary for a basic Line chart dataset.
 * Simulates a random walk trend (e.g., stock price or temperature).
 */
export const lineChartArbitrary = fc.record({
  startValue: fc.integer({ min: 100,
    max: 250 }),
  days: fc.integer({ min: 35,
    max: 50 }),
  trend: fc.constantFrom(
    -1,
    1,
    2,
  ), // Overall bias
  volatility: fc.integer({ min: 3,
    max: 8 }),
}).chain((config) => {
  // Generate a sequence of deltas
  return fc.array(
    fc.integer({ min: -config.volatility,
      max: config.volatility }),
    { minLength: config.days,
      maxLength: config.days },
  ).map((deltas) => {
    const today = ANCHOR_DATE

    const data = deltas.reduce<Array<{ date: string
      value: number }>>(
      (acc, delta, i) => {
        // @ts-expect-error - suppress strictNullChecks/type errors
        const prevValue = i === 0 ? config.startValue : acc[i - 1].value
        const wave = Math.round(5 * Math.sin(i / 3))
        const nextValue = Math.max(
          10,
          prevValue + delta + config.trend + wave,
        )

        const date = today.subtract({ days: config.days - i }).toString()

        return [...acc,
          { date,
            value: nextValue }]
      },
      [],
    )

    return {
      type: 'line',
      data,
    }
  })
})

// First-of-month anchor for the stacked-area dataset -- fixed for the same
// determinism reason as ANCHOR_DATE above. Twelve consecutive months give
// each region series 12 datapoints, matching the per-series richness guide.
const STACKED_AREA_MONTH_START = Temporal.PlainDate.from('2024-01-01')
const STACKED_AREA_MONTHS = Array.from(
  { length: 12 },
  (_, i) => STACKED_AREA_MONTH_START.add({ months: i }).toString(),
)

// Every Month x Region combination, generated once (order fixed by
// STACKED_AREA_MONTHS/REGIONS, month-major) so sampled revenue values can be
// paired onto it via R.zip below -- same cross-product technique as
// bar.ts's stackedBarChartArbitrary, but over a monthly time axis so the
// series read as stacked areas over time rather than categorical bars.
const MONTH_REGION_COMBINATIONS = STACKED_AREA_MONTHS.flatMap(date =>
  REGIONS.map(region => ({ date, region })))

/**
 * Arbitrary for a multi-series (stacked) Area chart dataset.
 * Generates a Month x Region revenue cross-product -- every month has a
 * revenue figure for every region, enough series to exercise the area
 * chart's stack toggle. A per-region phase-shifted wave keeps each series'
 * curve non-monotonic and organic rather than a flat band.
 */
export const stackedAreaChartArbitrary = fc.record({
  maxRevenue: fc.integer({ min: 20_000,
    max: 60_000 }),
})
  .chain((config) => {
    return fc.record({
      combinations: fc.constant(MONTH_REGION_COMBINATIONS),
      revenues: fc.array(
        fc.integer({ min: 8000,
          max: config.maxRevenue }),
        { minLength: MONTH_REGION_COMBINATIONS.length,
          maxLength: MONTH_REGION_COMBINATIONS.length },
      ),
    })
  })
  .map((data) => {
    return {
      type: 'stacked-area',
      data: R.zip(data.combinations, data.revenues).map(([combo, rawRevenue], idx) => {
        const regionIndex = REGIONS.indexOf(combo.region)
        const monthIndex = Math.floor(idx / REGIONS.length)
        // Phase-shifted per region so the stacked bands ebb and flow instead
        // of tracking each other -- 3000-unit swing on an 8000+ baseline.
        const wave = Math.round(3000 * Math.sin((monthIndex + regionIndex * 2) / 3))
        const revenue = Math.max(2000, rawRevenue + wave)

        return {
          date: combo.date,
          region: combo.region,
          revenue,
        }
      }),
    }
  })
