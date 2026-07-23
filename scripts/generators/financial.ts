import * as fc from 'fast-check'
import { Temporal } from 'temporal-polyfill'

// Fixed rather than Temporal.Now.plainDateISO() -- a wall-clock anchor made
// this arbitrary non-deterministic across days despite the seeded sampling,
// defeating the whole point of `getDeterministicSample` (same class of bug
// already fixed in line.ts's ANCHOR_DATE).
const ANCHOR_DATE = Temporal.PlainDate.from('2024-01-31')

/**
 * Arbitrary for Candlestick chart dataset.
 * Simulates stock price movement.
 * `noNaN: true` on every fc.float() call below: fast-check's float arbitrary
 * can still draw NaN even with min/max bounds set (confirmed empirically in
 * scatter.ts) -- without this, a deterministic sample could produce a candle
 * with `low: NaN` or `high: NaN`, which would silently corrupt generated
 * frontmatter and break rendering for that point.
 */
export const candlestickChartArbitrary = fc.record({
  startValue: fc.integer({ min: 100,
    max: 200 }),
  days: fc.integer({ min: 14,
    max: 30 }),
  volatility: fc.integer({ min: 2,
    max: 10 }),
}).chain((config) => {
  return fc.array(
    fc.record({
      delta: fc.integer({ min: -config.volatility,
        max: config.volatility }),
      lowDrop: fc.float({ min: 0,
        max: config.volatility / 2,
        noNaN: true }),
      highRise: fc.float({ min: 0,
        max: config.volatility / 2,
        noNaN: true }),
    }),
    { minLength: config.days,
      maxLength: config.days },
  ).map((moves) => {
    const today = ANCHOR_DATE

    interface Candle {
      readonly date: string
      readonly open: number
      readonly close: number
      readonly low: number
      readonly high: number
    }

    const result = moves.reduce<{ readonly currentPrice: number, readonly candles: ReadonlyArray<Candle> }>(
      (acc, move, i) => {
        const open = acc.currentPrice
        const close = open + move.delta
        const safeOpen = Math.max(1, open)
        const safeClose = Math.max(1, close)

        const low = Math.max(0.5, Math.min(safeOpen, safeClose) - move.lowDrop)
        const high = Math.max(safeOpen, safeClose) + move.highRise

        const date = today.subtract({ days: config.days - i }).toString()

        const candle: Candle = {
          date,
          open: parseFloat(safeOpen.toFixed(2)),
          close: parseFloat(safeClose.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
        }

        return {
          currentPrice: safeClose,
          candles: [...acc.candles,
            candle],
        }
      },
      { currentPrice: config.startValue,
        candles: [] },
    )

    return {
      type: 'candlestick',
      data: result.candles,
    }
  })
})
