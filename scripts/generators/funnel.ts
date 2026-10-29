import * as fc from 'fast-check'

export const FUNNEL_STAGES = [
  'Ad Impression',
  'Landing Page',
  'Site Visit',
  'Category Browse',
  'Product Search',
  'Product View',
  'Wishlist Save',
  'Cart Add',
  'Checkout Start',
  'Shipping Info',
  'Payment Info',
  'Purchase Completed',
] as const

/**
 * Arbitrary for Funnel chart data.
 * Generates 8-12 stages with realistic drop-off factor and natural variance.
 */
export const funnelChartArbitrary = fc.record({
  steps: fc.subarray(
    [...FUNNEL_STAGES],
    { minLength: 8, maxLength: 12 },
  ),
  initialValue: fc.integer({ min: 8000, max: 15_000 }),
}).chain((config) => {
  return fc.array(
    fc.integer({ min: 10,
      max: 28 }), // percentage drop factor between steps
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
    }, { current: config.initialValue,
      items: [] })

    return {
      type: 'funnel',
      data: result.items,
    }
  })
})
