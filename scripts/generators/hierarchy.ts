import * as fc from 'fast-check'

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
 * treemap-chart's transformer (src/charts/transformers/treemap.ts) calls the
 * same buildHierarchy(data, pathProp, valueProp) as sunburst -- it expects
 * slash-delimited hierarchical paths, not a flat name/value list. Reuses the
 * same hierarchyData as sunburst/tree above (also matches the ground-truth
 * Project_Management.base, which bound all three views to the identical
 * note.Path/note.Value props) instead of a separate flat theme-based shape.
 */
export const treemapChartArbitrary = fc.constant({
  type: 'treemap',
  data: hierarchyData,
})
