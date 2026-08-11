import * as fc from 'fast-check'

/**
 * Arbitrary for Sankey chart data.
 * Generates a simple multi-stage flow.
 */
export const sankeyChartArbitrary = fc.constant(null).map(() => {
  // Rich multi-stage user journey flow
  const data = [
    { source: 'Homepage', target: 'Product Page', users: 6500 },
    { source: 'Homepage', target: 'Blog', users: 3200 },
    { source: 'Ad Campaign', target: 'Product Page', users: 4800 },
    { source: 'Organic Search', target: 'Blog', users: 5100 },
    { source: 'Organic Search', target: 'Product Page', users: 2400 },
    { source: 'Product Page', target: 'Cart', users: 7200 },
    { source: 'Product Page', target: 'Exit', users: 4500 },
    { source: 'Blog', target: 'Product Page', users: 2900 },
    { source: 'Blog', target: 'Exit', users: 4400 },
    { source: 'Cart', target: 'Checkout', users: 5600 },
    { source: 'Cart', target: 'Exit', users: 1600 },
    { source: 'Checkout', target: 'Purchase', users: 4800 },
    { source: 'Checkout', target: 'Exit', users: 800 },
  ]
  return {
    type: 'sankey',
    data,
  }
})

/**
 * Arbitrary for Graph chart data.
 * Generates nodes and links across network security zones.
 */
export const graphChartArbitrary = fc.record({
  nodeCount: fc.integer({ min: 10,
    max: 16 }),
}).chain((config) => {
  return fc.array(
    fc.record({
      targetIndex: fc.integer({ min: 0,
        max: config.nodeCount - 1 }),
      value: fc.integer({ min: 1,
        max: 20 }),
    }),
    { minLength: config.nodeCount * 2,
      maxLength: config.nodeCount * 3 },
  ).map((linksData) => {
    const nodes = [
      'Core Router',
      'Primary Firewall',
      'DMZ Switch',
      'Web Gateway',
      'App Cluster A',
      'App Cluster B',
      'Database Master',
      'Database Replica',
      'Secondary Firewall',
      'Workstation Pool',
      'Dev Laptop',
      'IoT Sensor',
      'VPN Gateway',
      'Backup Vault',
      'Auth Server',
      'Monitoring Node',
    ]

    const zones = ['DMZ', 'Internal', 'Cloud'] as const

    const links = linksData.map((l, i) => {
      const sourceIndex = i % config.nodeCount
      const rawTargetIndex = l.targetIndex
      const targetIndex = sourceIndex === rawTargetIndex
        ? (rawTargetIndex + 1) % config.nodeCount
        : rawTargetIndex

      const safeSource = nodes[sourceIndex % nodes.length] ?? 'Core Router'
      const safeTarget = nodes[targetIndex % nodes.length] ?? 'Core Router'
      const safeZone = zones[i % zones.length] ?? 'Internal'

      return {
        source: safeSource,
        target: safeTarget,
        traffic: l.value,
        zone: safeZone,
      }
    })

    return {
      type: 'graph',
      data: links,
    }
  })
})

/**
 * Arbitrary for Lines chart data.
 * Generates coordinate pairs.
 */
export const linesChartArbitrary = fc.record({
  count: fc.integer({ min: 18,
    max: 30 }),
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
