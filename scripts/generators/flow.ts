import * as fc from 'fast-check'

/**
 * Arbitrary for Sankey chart data.
 * Generates a simple multi-stage flow.
 */
export const sankeyChartArbitrary = fc.constant(null).map(() => {
  // Hardcoded simple structure to ensure valid flow
  const data = [
    { source: 'Homepage',
      target: 'Product Page',
      users: 5000 },
    { source: 'Homepage',
      target: 'Blog',
      users: 2000 },
    { source: 'Product Page',
      target: 'Cart',
      users: 3000 },
    { source: 'Product Page',
      target: 'Exit',
      users: 2000 },
    { source: 'Cart',
      target: 'Checkout',
      users: 2500 },
    { source: 'Cart',
      target: 'Exit',
      users: 500 },
    { source: 'Checkout',
      target: 'Purchase',
      users: 2000 },
    { source: 'Checkout',
      target: 'Exit',
      users: 500 },
  ]
  return {
    type: 'sankey',
    data,
  }
})

/**
 * Arbitrary for Graph chart data.
 * Generates nodes and links.
 */
export const graphChartArbitrary = fc.record({
  nodeCount: fc.integer({ min: 5,
    max: 10 }),
}).chain((config) => {
  return fc.array(
    fc.record({
      targetIndex: fc.integer({ min: 0,
        max: config.nodeCount - 1 }),
      value: fc.integer({ min: 1,
        max: 10 }),
    }),
    { minLength: config.nodeCount,
      maxLength: config.nodeCount * 2 },
  ).map((linksData) => {
    const nodes = [
      'Router',
      'Switch',
      'Server A',
      'Server B',
      'Database',
      'Firewall',
      'Client PC',
      'Laptop',
      'Printer',
      'Access Point',
      'Phone',
      'Tablet',
    ]

    // Create links ensuring source != target to avoid self-loops if desired
    const links = linksData.map((l, i) => {
      const sourceIndex = i % config.nodeCount
      const rawTargetIndex = l.targetIndex
      const targetIndex = sourceIndex === rawTargetIndex
        ? (rawTargetIndex + 1) % config.nodeCount
        : rawTargetIndex

      // `nodes.length` guarantees these indices are always in range, but
      // noUncheckedIndexedAccess can't prove that statically for a
      // computed index -- the fallback never actually triggers.
      const safeSource = nodes[sourceIndex % nodes.length] ?? 'Router'
      const safeTarget = nodes[targetIndex % nodes.length] ?? 'Router'

      return {
        source: safeSource,
        target: safeTarget,
        traffic: l.value,
        zone: i % 2 === 0 ? 'DMZ' : 'Internal', // Optional category
      }
    })

    return {
      type: 'graph',
      data: links, // The transformer infers nodes from links
    }
  })
})

/**
 * Arbitrary for Lines chart data.
 * Generates coordinate pairs.
 * Uses fc.integer (scaled) rather than fc.float -- fc.float's default
 * generator is heavily biased toward 0/boundary values under
 * getDeterministicSample's numRuns:1 sampling (confirmed empirically: at
 * the vault's actual seed, 6 of 7 generated lines collapsed to a degenerate
 * (0,0)->(0,0) point), which produced lines clustered in one corner instead
 * of spread across the coordinate space. fc.integer doesn't share that bias
 * (matches the identical fix already applied to histogramChartArbitrary in
 * distribution.ts).
 */
export const linesChartArbitrary = fc.record({
  count: fc.integer({ min: 5,
    max: 20 }),
}).chain((config) => {
  return fc.array(
    fc.record({
      x1: fc.integer({ min: 0,
        max: 1000 }),
      y1: fc.integer({ min: 0,
        max: 1000 }),
      x2: fc.integer({ min: 0,
        max: 1000 }),
      y2: fc.integer({ min: 0,
        max: 1000 }),
    }),
    { minLength: config.count,
      maxLength: config.count },
  ).map((lines) => {
    return {
      type: 'lines',
      data: lines.map(l => ({
        start_x: l.x1 / 10,
        start_y: l.y1 / 10,
        end_x: l.x2 / 10,
        end_y: l.y2 / 10,
      })),
    }
  })
})
