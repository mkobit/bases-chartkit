import * as fc from 'fast-check'
import * as R from 'remeda'
import { DEPARTMENTS, QUARTERS, REGIONS, themeSubset } from './themes'

/**
 * Arbitrary for a basic Bar chart dataset.
 * Generates department spend figures -- 8-10 categories, enough for a real
 * ranking while staying label-readable in a screenshot.
 */
export const barChartArbitrary = themeSubset(
  DEPARTMENTS,
  8,
)
  .chain((categories) => {
    return fc.record({
      categories: fc.constant(categories),
      values: fc.array(
        fc.integer({ min: 10_000,
          max: 100_000 }),
        { minLength: categories.length,
          maxLength: categories.length },
      ),
    })
  })
  .map(data => ({
    type: 'bar',
    data: R.zip(data.categories, data.values).map(([cat, value]) => ({
      category: cat,
      value,
    })),
  }))

// Every Quarter x Region combination, generated once (order fixed by
// QUARTERS/REGIONS) so sampled revenue values can be paired onto it via
// R.zip below -- mirrors the Day x Hour cross-product technique in
// heatmap.ts, but avoids that file's positional `values[index]` indexing,
// which would type as `number | undefined` under this repo's
// noUncheckedIndexedAccess and fail to satisfy FrontmatterValue.
const QUARTER_REGION_COMBINATIONS = QUARTERS.flatMap(quarter =>
  REGIONS.map(region => ({ quarter, region })))

/**
 * Arbitrary for a Stacked Bar chart dataset.
 * Generates a Quarter x Region revenue cross-product -- every quarter has a
 * revenue figure for every region, enough series to show real stacking.
 */
export const stackedBarChartArbitrary = fc.record({
  maxRevenue: fc.integer({ min: 20_000,
    max: 100_000 }),
})
  .chain((config) => {
    return fc.record({
      combinations: fc.constant(QUARTER_REGION_COMBINATIONS),
      revenues: fc.array(
        fc.integer({ min: 5000,
          max: config.maxRevenue }),
        { minLength: QUARTER_REGION_COMBINATIONS.length,
          maxLength: QUARTER_REGION_COMBINATIONS.length },
      ),
    })
  })
  .map(data => ({
    type: 'stacked-bar',
    data: R.zip(data.combinations, data.revenues).map(([combo, revenue]) => ({
      quarter: combo.quarter,
      region: combo.region,
      revenue,
    })),
  }))
