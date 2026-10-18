import * as fc from 'fast-check'
import * as R from 'remeda'
import { TRAFFIC_SOURCES } from './themes'

export const PIE_TRAFFIC_SOURCES = [
  ...TRAFFIC_SOURCES,
  'Affiliate',
  'Display Ads',
  'Newsletter',
  'Social Media Campaign',
] as const

/**
 * Arbitrary for a basic Pie chart dataset.
 * Generates 8-12 diverse name-value pairs using Traffic Sources theme
 * with realistic volumes (500 to 25,000) and natural variance.
 */
export const pieChartArbitrary = fc.subarray(
  [...PIE_TRAFFIC_SOURCES],
  { minLength: 8, maxLength: 12 },
)
  .chain((names) => {
    return fc.record({
      names: fc.constant(names),
      values: fc.array(
        fc.integer({ min: 500,
          max: 25_000 }),
        { minLength: names.length,
          maxLength: names.length },
      ),
    })
  })
  .map(data => ({
    type: 'pie',
    // R.zip pairs each name with its value -- avoids positional
    // `data.values[i]` indexing, which would type as `number | undefined`
    // under this repo's noUncheckedIndexedAccess (same fix as bar.ts's
    // stackedBarChartArbitrary and heatmap.ts's heatmapChartArbitrary).
    data: R.zip(data.names, data.values).map(([name, value]) => ({
      name,
      value,
    })),
  }))
