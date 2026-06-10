import * as fc from 'fast-check'
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
    data: data.names.map((name, i) => ({
      name: name,
      value: data.values[i],
    })),
  }))
