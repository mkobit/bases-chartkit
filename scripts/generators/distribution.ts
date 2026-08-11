import * as fc from 'fast-check'
import * as R from 'remeda'
import { PRODUCT_NAMES, themeSubset } from './themes'

/**
 * Arbitrary for Boxplot data.
 */
export const boxplotChartArbitrary = themeSubset(PRODUCT_NAMES, 5)
  .chain((categories) => {
    return fc.record({
      categories: fc.constant(categories),
      // Generate multiple points per category to form a distribution with distinct category medians
      values: fc.array(
        fc.array(fc.integer({ min: 10,
          max: 90 }), { minLength: 25,
          maxLength: 60 }),
        { minLength: categories.length,
          maxLength: categories.length },
      ),
    })
  })
  .map((data) => {
    const flattenedData = data.categories.flatMap((cat, catIndex) => {
      const vals = data.values[catIndex]
      // Add a category offset so each product exhibits a distinct median & spread
      const offset = (catIndex % 3) * 15 - 10
      return vals
        ? vals.map(val => ({ category: cat,
          value: Math.max(0, val + offset) }))
        : []
    })
    return {
      type: 'boxplot',
      data: flattenedData,
    }
  })

/**
 * Arbitrary for Histogram data.
 * Generates a list of numeric values with a multi-modal distribution forming clear peaks.
 * Uses fc.integer (scaled) rather than fc.float to avoid 0-boundary bias under numRuns: 1 sampling.
 */
export const histogramChartArbitrary = fc.array(
  fc.record({
    base: fc.integer({ min: 10, max: 90 }),
    peakSelect: fc.integer({ min: 0, max: 10 }),
  }),
  { minLength: 120,
    maxLength: 250 },
).map(items => ({
  type: 'histogram',
  data: items.map((item) => {
    // Combine base with a dual-peak distribution centered around 30 and 70
    const center = item.peakSelect < 5 ? 30 : 70
    const val = Math.max(5, Math.min(95, Math.round(center + (item.base - 50) * 0.5)))
    return { value: parseFloat(val.toFixed(2)) }
  }),
}))

/**
 * Arbitrary for Pareto data.
 * Generates unsorted items with exponential-style decay to show a strong 80/20 curve.
 */
export const paretoChartArbitrary = themeSubset(PRODUCT_NAMES, 8)
  .chain((names) => {
    return fc.record({
      names: fc.constant(names),
      multipliers: fc.array(
        fc.integer({ min: 5, max: 20 }),
        { minLength: names.length, maxLength: names.length },
      ),
    })
  })
  .map(data => ({
    type: 'pareto',
    data: R.zip(data.names, data.multipliers).map(([name, mult], idx) => ({
      name,
      value: Math.round(5000 / (idx + 1) + mult * 20),
    })),
  }))

const WATERFALL_STEP_NAMES = [
  'Starting Balance',
  'Q1 Gross Revenue',
  'R&D Operations',
  'Marketing Campaign',
  'Q2 Gross Revenue',
  'Infrastructure Cost',
  'Tax & Interest',
  'Net Balance',
] as const

/**
 * Arbitrary for Waterfall data.
 * Generates a realistic financial balance sequence of positive and negative changes.
 */
export const waterfallChartArbitrary = fc.array(
  fc.integer({ min: -60, max: 120 }),
  { minLength: WATERFALL_STEP_NAMES.length, maxLength: WATERFALL_STEP_NAMES.length },
).map((changes) => {
  return {
    type: 'waterfall',
    data: WATERFALL_STEP_NAMES.map((step, i) => {
      // First and last steps are structural totals; middle steps are positive/negative deltas
      const rawVal = changes[i] ?? 0
      const value = i === 0 ? 500 : i === WATERFALL_STEP_NAMES.length - 1 ? 0 : (i % 2 === 1 ? Math.abs(rawVal) * 3 : -Math.abs(rawVal) * 2)
      return {
        step,
        value,
      }
    }),
  }
})
