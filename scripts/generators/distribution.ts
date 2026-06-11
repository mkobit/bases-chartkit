import * as fc from 'fast-check'
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
 * Generates a list of numeric values.
 */
export const histogramChartArbitrary = fc.array(
  fc.float({ min: 0,
    max: 100 }),
  { minLength: 50,
    maxLength: 200 },
).map(values => ({
  type: 'histogram',
  data: values.map(v => ({ value: parseFloat(v.toFixed(2)) })),
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
    data: data.names.map((name, i) => ({
      name: name,
      value: data.values[i],
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
