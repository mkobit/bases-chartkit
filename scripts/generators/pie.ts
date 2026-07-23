import * as fc from 'fast-check'
import * as R from 'remeda'
import { TRAFFIC_SOURCES, themeSubset } from './themes'

/**
 * Arbitrary for a basic Pie chart dataset.
 * Generates name-value pairs using Traffic Sources theme.
 */
export const pieChartArbitrary = themeSubset(
  TRAFFIC_SOURCES,
  3,
)
  .chain((names) => {
    return fc.record({
      names: fc.constant(names),
      values: fc.array(
        fc.integer({ min: 100,
          max: 2000 }),
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
