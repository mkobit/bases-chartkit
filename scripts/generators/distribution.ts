import * as fc from 'fast-check'
import * as R from 'remeda'
import { PRODUCT_NAMES, themeSubset } from './themes'

/**
 * Arbitrary for Boxplot data.
 */
export const boxplotChartArbitrary = themeSubset(PRODUCT_NAMES, 2)
  .chain((categories) => {
    return fc.record({
      categories: fc.constant(categories),
      // Generate multiple points per category to form a distribution
      values: fc.array(
        fc.array(fc.integer({ min: 0,
          max: 100 }), { minLength: 10,
          maxLength: 50 }),
        { minLength: categories.length,
          maxLength: categories.length },
      ),
    })
  })
  .map((data) => {
    const flattenedData = data.categories.flatMap((cat, index) => {
      const vals = data.values[index]
      return vals
        ? vals.map(val => ({ category: cat,
          value: val }))
        : []
    })
    return {
      type: 'boxplot',
      data: flattenedData,
    }
  })

/**
 * Arbitrary for Histogram data.
 * Generates a list of numeric values, 2 decimal places.
 * Uses fc.integer (scaled) rather than fc.float -- fc.float's default
 * generator is heavily biased toward 0/boundary values under
 * getDeterministicSample's numRuns:1 sampling (confirmed empirically across
 * several seeds: 80-96% of values landed under 5), which produced a
 * degenerate single-bar histogram instead of a real distribution. fc.integer
 * doesn't share that bias (matches boxplot/pareto/waterfall's arbitraries
 * above, which all already use fc.integer for the same reason).
 */
export const histogramChartArbitrary = fc.array(
  fc.integer({ min: 0,
    max: 10_000 }),
  { minLength: 50,
    maxLength: 200 },
).map(values => ({
  type: 'histogram',
  data: values.map(v => ({ value: parseFloat((v / 100).toFixed(2)) })),
}))

/**
 * Arbitrary for Pareto data.
 * Similar to Bar chart but usually unsorted (transformer sorts it).
 */
export const paretoChartArbitrary = themeSubset(PRODUCT_NAMES, 4)
  .chain((names) => {
    return fc.record({
      names: fc.constant(names),
      values: fc.array(
        fc.integer({ min: 10,
          max: 500 }),
        { minLength: names.length,
          maxLength: names.length },
      ),
    })
  })
  .map(data => ({
    type: 'pareto',
    data: R.zip(data.names, data.values).map(([name, value]) => ({
      name,
      value,
    })),
  }))

/**
 * Arbitrary for Waterfall data.
 * Generates a sequence of positive and negative changes.
 */
export const waterfallChartArbitrary = fc.record({
  steps: fc.integer({ min: 5,
    max: 10 }),
}).chain((config) => {
  return fc.array(
    fc.integer({ min: -100,
      max: 100 }),
    { minLength: config.steps,
      maxLength: config.steps },
  ).map((values) => {
    return {
      type: 'waterfall',
      data: values.map((val, i) => ({
        step: `Step ${i + 1}`,
        value: val,
      })),
    }
  })
})
