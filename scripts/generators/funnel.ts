import * as fc from 'fast-check'

/**
 * Arbitrary for Funnel chart data.
 * Generates decreasing values.
 */
export const funnelChartArbitrary = fc.record({
  steps: fc.constant([
    'Ad Impression',
    'Site Visit',
    'Product View',
    'Cart Add',
    'Checkout Start',
    'Purchase Completed',
  ]),
}).chain((config) => {
  return fc.array(
    fc.integer({ min: 15,
      max: 35 }), // percentage drop factor between steps
    { minLength: config.steps.length,
      maxLength: config.steps.length },
  ).map((dropPercentages) => {
    const result = config.steps.reduce<{ readonly current: number, readonly items: ReadonlyArray<{ readonly step: string, readonly value: number }> }>((acc, step, i) => {
      const val = acc.current
      const dropPct = dropPercentages[i] ?? 20
      const nextVal = Math.max(10, Math.round(val * (100 - dropPct) / 100))
      return {
        current: nextVal,
        items: [...acc.items,
          { step,
            value: val }],
      }
    }, { current: 10_000,
      items: [] })

    return {
      type: 'funnel',
      data: result.items,
    }
  })
})

/**
 * Arbitrary for Gauge chart data.
 * Generates a single value.
 */
export const gaugeChartArbitrary = fc.integer({ min: 25,
  max: 95 }).map(val => ({
  type: 'gauge',
  data: [{ value: val }],
}))
