import * as fc from 'fast-check'
import * as R from 'remeda'
import { DEPARTMENTS, REGIONS, themeSubset } from './themes'

/**
 * Arbitrary for a basic Bar chart dataset.
 * Generates department spend figures -- 8-10 categories, enough for a real
 * ranking while staying label-readable in a screenshot.
 */
export const barChartArbitrary = themeSubset(
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
  .map(data => ({
    type: 'bar',
    data: R.zip(data.categories, data.values).map(([cat, value]) => ({
      category: cat,
      value,
    })),
  }))

const STACKED_BAR_QUARTERS = [
  'Q1 2024',
  'Q2 2024',
  'Q3 2024',
  'Q4 2024',
  'Q1 2025',
  'Q2 2025',
  'Q3 2025',
  'Q4 2025',
] as const

// Every Quarter x Region combination, generated once (order fixed by
// STACKED_BAR_QUARTERS/REGIONS, quarter-major) so sampled revenue values can be
// paired onto it via R.zip below -- mirrors the Day x Hour cross-product
// technique in heatmap.ts, but avoids that file's positional `values[index]`
// indexing, which would type as `number | undefined` under this repo's
// noUncheckedIndexedAccess and fail to satisfy FrontmatterValue.
const QUARTER_REGION_COMBINATIONS = STACKED_BAR_QUARTERS.flatMap(quarter =>
  REGIONS.map(region => ({ quarter, region })))

/**
 * Arbitrary for a Stacked Bar chart dataset.
 * Generates an 8-quarter x 4-region revenue cross-product -- every quarter has
 * a revenue figure for every region, spanning two years with organic variance.
 */
export const stackedBarChartArbitrary = fc.record({
  maxRevenue: fc.integer({ min: 30_000,
    max: 80_000 }),
})
  .chain((config) => {
    return fc.record({
      combinations: fc.constant(QUARTER_REGION_COMBINATIONS),
      revenues: fc.array(
        fc.integer({ min: 10_000,
          max: config.maxRevenue }),
        { minLength: QUARTER_REGION_COMBINATIONS.length,
          maxLength: QUARTER_REGION_COMBINATIONS.length },
      ),
    })
  })
  .map(data => ({
    type: 'stacked-bar',
    data: R.zip(data.combinations, data.revenues).map(([combo, rawRevenue], idx) => {
      const regionIndex = REGIONS.indexOf(combo.region)
      const quarterIndex = Math.floor(idx / REGIONS.length)
      // Phase-shifted wave per region gives seasonal variance so the stacked
      // bars ebb and flow across quarters rather than reading as uniform noise.
      const wave = Math.round(5000 * Math.sin((quarterIndex + regionIndex * 2) / 2))
      const revenue = Math.max(3000, rawRevenue + wave)

      return {
        quarter: combo.quarter,
        region: combo.region,
        revenue,
      }
    }),
  }))
