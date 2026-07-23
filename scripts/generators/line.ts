import * as fc from 'fast-check'
import { Temporal } from 'temporal-polyfill'

// Fixed rather than Temporal.Now.plainDateISO() -- a wall-clock anchor made
// this arbitrary non-deterministic across days despite the seeded sampling,
// defeating the whole point of `getDeterministicSample`.
const ANCHOR_DATE = Temporal.PlainDate.from('2024-01-31')

/**
 * Arbitrary for a basic Line chart dataset.
 * Simulates a random walk trend (e.g., stock price or temperature).
 */
export const lineChartArbitrary = fc.record({
  startValue: fc.integer({ min: 50,
    max: 100 }),
  days: fc.integer({ min: 20,
    max: 30 }),
  trend: fc.constantFrom(
    -2,
    0,
    2,
  ), // Overall bias
  volatility: fc.integer({ min: 1,
    max: 5 }),
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
        const nextValue = Math.max(
          0,
          prevValue + delta + config.trend,
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
