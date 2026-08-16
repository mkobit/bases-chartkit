import * as fc from 'fast-check'

const hierarchyData = [
  { path: 'Company/CEO/VP Sales/Enterprise', employees: 15 },
  { path: 'Company/CEO/VP Sales/SMB', employees: 10 },
  { path: 'Company/CEO/VP Engineering/Frontend Lead', employees: 12 },
  { path: 'Company/CEO/VP Engineering/Backend Lead', employees: 16 },
  { path: 'Company/CEO/VP Engineering/DevOps', employees: 8 },
  { path: 'Company/CEO/VP Marketing/Growth', employees: 9 },
  { path: 'Company/CEO/VP Marketing/Brand', employees: 5 },
  { path: 'Company/CEO/VP Product/Design System', employees: 7 },
  { path: 'Company/CEO/VP Operations/IT Support', employees: 6 },
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

// A treemap earns its keep when it shows many area-proportional leaves grouped
// under several visibly distinct branches. The sunburst/tree sample above is a
// single-root chain (Company -> CEO -> one branch), which renders as one big
// box that only differentiates at the leaves -- fine for a radial/orthogonal
// layout, thin for a treemap. This dataset is multi-root (six divisions) with
// three levels and a wide spread of headcounts (3-18), so the top level lays
// out as several sized blocks that each subdivide.
const treemapHierarchyData = [
  { path: 'Engineering/Frontend/Web Platform', employees: 14 },
  { path: 'Engineering/Frontend/Mobile', employees: 9 },
  { path: 'Engineering/Frontend/Design Systems', employees: 5 },
  { path: 'Engineering/Backend/API Services', employees: 18 },
  { path: 'Engineering/Backend/Data Platform', employees: 12 },
  { path: 'Engineering/Backend/Payments', employees: 7 },
  { path: 'Engineering/Infrastructure/SRE', employees: 8 },
  { path: 'Engineering/Infrastructure/Security', employees: 6 },
  { path: 'Sales/Enterprise/West', employees: 11 },
  { path: 'Sales/Enterprise/East', employees: 13 },
  { path: 'Sales/SMB/Inbound', employees: 9 },
  { path: 'Sales/SMB/Outbound', employees: 7 },
  { path: 'Marketing/Growth/Performance', employees: 6 },
  { path: 'Marketing/Growth/Lifecycle', employees: 4 },
  { path: 'Marketing/Brand/Content', employees: 5 },
  { path: 'Marketing/Brand/Events', employees: 3 },
  { path: 'Product/Core/Product Management', employees: 5 },
  { path: 'Product/Core/Design', employees: 6 },
  { path: 'Product/Research/UX Research', employees: 4 },
  { path: 'Operations/People/Recruiting', employees: 5 },
  { path: 'Operations/People/HR', employees: 4 },
  { path: 'Operations/Finance/Accounting', employees: 6 },
  { path: 'Operations/Finance/FP&A', employees: 3 },
  { path: 'Customer Success/Onboarding/Implementation', employees: 8 },
  { path: 'Customer Success/Support/Tier 1', employees: 10 },
  { path: 'Customer Success/Support/Tier 2', employees: 6 },
]

/**
 * Arbitrary for Treemap data.
 * treemap-chart's transformer (src/charts/transformers/treemap.ts) calls the
 * same buildHierarchy(data, pathProp, valueProp) as sunburst -- it expects
 * slash-delimited hierarchical paths, not a flat name/value list. Uses its own
 * multi-root, three-level org (treemapHierarchyData) rather than the single-root
 * sunburst/tree sample so the treemap's area-and-nesting story actually shows.
 */
export const treemapChartArbitrary = fc.constant({
  type: 'treemap',
  data: treemapHierarchyData,
})
