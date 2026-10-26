import * as fc from 'fast-check'
import * as R from 'remeda'
import { DEPARTMENTS, themeSubset } from './themes'

export interface RoseSample {
  readonly type: 'rose'
  readonly data: ReadonlyArray<{ readonly category: string, readonly value: number }>
}

/**
 * Arbitrary for a Rose chart dataset.
 * Generates department spend figures -- 10 categories, enough for a rich
 * ranking and petal variance while staying label-readable.
 */
export const roseChartArbitrary = themeSubset(
  DEPARTMENTS,
  10,
)
  .chain((categories) => {
    return fc.record({
      categories: fc.constant(categories),
      values: fc.array(
        fc.integer({ min: 15_000,
          max: 250_000 }),
        { minLength: categories.length,
          maxLength: categories.length },
      ),
    })
  })
  .map((data): RoseSample => ({
    type: 'rose',
    data: R.zip(data.categories, data.values).map(([cat, value]) => ({
      category: cat,
      value,
    })),
  }))
