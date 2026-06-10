import * as fc from 'fast-check'
import { WEEK_DAYS, themeSubset } from './themes'

/**
 * Arbitrary for a basic Bar chart dataset.
 * Generates a list of categories (Days) and corresponding numerical values.
 */
export const barChartArbitrary = themeSubset(
  WEEK_DAYS,
  5,
)
  .chain((categories) => {
    return fc.record({
      categories: fc.constant(categories),
      values: fc.array(
        fc.integer({ min: 10,
          max: 300 }),
        { minLength: categories.length,
          maxLength: categories.length },
      ),
    })
  })
  .map(data => ({
    type: 'bar',
    data: data.categories.map((cat, i) => ({
      category: cat,
      value: data.values[i],
    })),
  }))
