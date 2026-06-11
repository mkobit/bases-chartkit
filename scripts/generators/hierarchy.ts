import * as fc from 'fast-check'
import { PRODUCT_NAMES, themeSubset } from './themes'

const hierarchyData = [
  { path: 'Company/CEO/VP Sales',
    employees: 10 },
  { path: 'Company/CEO/VP Engineering',
    employees: 5 },
  { path: 'Company/CEO/VP Engineering/Frontend Lead',
    employees: 8 },
  { path: 'Company/CEO/VP Engineering/Backend Lead',
    employees: 12 },
  { path: 'Company/CEO/VP Marketing',
    employees: 7 },
  { path: 'Company/CEO/VP Marketing/Growth',
    employees: 4 },
]

/**
 * Arbitrary for Sunburst data.
 */
export const sunburstChartArbitrary = fc.constant({
  type: 'sunburst',
  data: hierarchyData,
})

/**
 * Arbitrary for Tree data.
 */
export const treeChartArbitrary = fc.constant({
  type: 'tree',
  data: hierarchyData,
})

/**
 * Arbitrary for Treemap data.
 * Currently flat structure based on transformer implementation.
 */
export const treemapChartArbitrary = themeSubset(PRODUCT_NAMES, 4)
  .chain((names) => {
    return fc.record({
      names: fc.constant(names),
      values: fc.array(
        fc.integer({ min: 10,
          max: 100 }),
        { minLength: names.length,
          maxLength: names.length },
      ),
    })
  })
  .map(data => ({
    type: 'treemap',
    data: data.names.map((name, i) => ({
      name: name,
      value: data.values[i],
    })),
  }))
