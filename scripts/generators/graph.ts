import * as fc from 'fast-check'
import * as R from 'remeda'

export type NetworkZone
  = | 'Edge & Security'
    | 'Gateway & Routing'
    | 'Core Services'
    | 'Data & Storage'
    | 'Observability'

export interface GraphLinkSample {
  readonly source: string
  readonly target: string
  readonly traffic: number
  readonly zone: NetworkZone
}

export interface GraphSample {
  readonly type: 'graph'
  readonly data: readonly GraphLinkSample[]
}

interface TopologyEdgeTemplate {
  readonly source: string
  readonly target: string
  readonly zone: NetworkZone
  readonly minTraffic: number
  readonly maxTraffic: number
}

/**
 * 18 distinct nodes across 5 architectural tiers, connected by 28 directed links.
 * Every node appears as a `source` at least once so that source-based category
 * extraction assigns a tier to all 18 nodes in the topology.
 */
const TOPOLOGY_EDGES: readonly TopologyEdgeTemplate[] = [
  // Edge & Security tier (4 nodes)
  { source: 'Edge Router', target: 'WAF Gateway', zone: 'Edge & Security', minTraffic: 420, maxTraffic: 680 },
  { source: 'Edge Router', target: 'Primary Firewall', zone: 'Edge & Security', minTraffic: 310, maxTraffic: 540 },
  { source: 'WAF Gateway', target: 'Ingress Load Balancer', zone: 'Edge & Security', minTraffic: 350, maxTraffic: 600 },
  { source: 'WAF Gateway', target: 'Primary Firewall', zone: 'Edge & Security', minTraffic: 120, maxTraffic: 260 },
  { source: 'Primary Firewall', target: 'API Gateway', zone: 'Edge & Security', minTraffic: 280, maxTraffic: 520 },
  { source: 'Primary Firewall', target: 'Service Mesh Proxy', zone: 'Edge & Security', minTraffic: 150, maxTraffic: 340 },
  { source: 'VPN Concentrator', target: 'Primary Firewall', zone: 'Edge & Security', minTraffic: 45, maxTraffic: 130 },
  { source: 'VPN Concentrator', target: 'Metrics Collector', zone: 'Edge & Security', minTraffic: 15, maxTraffic: 45 },

  // Gateway & Routing tier (3 nodes)
  { source: 'Ingress Load Balancer', target: 'API Gateway', zone: 'Gateway & Routing', minTraffic: 300, maxTraffic: 580 },
  { source: 'Ingress Load Balancer', target: 'Catalog Service', zone: 'Gateway & Routing', minTraffic: 180, maxTraffic: 360 },
  { source: 'API Gateway', target: 'Auth Service', zone: 'Gateway & Routing', minTraffic: 220, maxTraffic: 440 },
  { source: 'API Gateway', target: 'Order Service', zone: 'Gateway & Routing', minTraffic: 160, maxTraffic: 350 },
  { source: 'API Gateway', target: 'Catalog Service', zone: 'Gateway & Routing', minTraffic: 240, maxTraffic: 480 },
  { source: 'Service Mesh Proxy', target: 'Billing Service', zone: 'Gateway & Routing', minTraffic: 110, maxTraffic: 250 },
  { source: 'Service Mesh Proxy', target: 'Notification Worker', zone: 'Gateway & Routing', minTraffic: 75, maxTraffic: 180 },

  // Core Services tier (5 nodes)
  { source: 'Auth Service', target: 'Redis Cache', zone: 'Core Services', minTraffic: 190, maxTraffic: 410 },
  { source: 'Auth Service', target: 'Primary Postgres', zone: 'Core Services', minTraffic: 85, maxTraffic: 190 },
  { source: 'Order Service', target: 'Primary Postgres', zone: 'Core Services', minTraffic: 140, maxTraffic: 310 },
  { source: 'Order Service', target: 'Event Bus', zone: 'Core Services', minTraffic: 160, maxTraffic: 340 },
  { source: 'Billing Service', target: 'Primary Postgres', zone: 'Core Services', minTraffic: 95, maxTraffic: 210 },
  { source: 'Billing Service', target: 'Event Bus', zone: 'Core Services', minTraffic: 80, maxTraffic: 175 },
  { source: 'Catalog Service', target: 'Read Replica', zone: 'Core Services', minTraffic: 210, maxTraffic: 450 },
  { source: 'Catalog Service', target: 'Redis Cache', zone: 'Core Services', minTraffic: 260, maxTraffic: 520 },
  { source: 'Notification Worker', target: 'Log Aggregator', zone: 'Core Services', minTraffic: 40, maxTraffic: 110 },

  // Data & Storage tier (4 nodes)
  { source: 'Primary Postgres', target: 'Read Replica', zone: 'Data & Storage', minTraffic: 170, maxTraffic: 360 },
  { source: 'Read Replica', target: 'Metrics Collector', zone: 'Data & Storage', minTraffic: 25, maxTraffic: 70 },
  { source: 'Redis Cache', target: 'Metrics Collector', zone: 'Data & Storage', minTraffic: 30, maxTraffic: 85 },
  { source: 'Event Bus', target: 'Notification Worker', zone: 'Data & Storage', minTraffic: 130, maxTraffic: 290 },

  // Observability tier (2 nodes)
  { source: 'Metrics Collector', target: 'Log Aggregator', zone: 'Observability', minTraffic: 60, maxTraffic: 150 },
  { source: 'Log Aggregator', target: 'Primary Firewall', zone: 'Observability', minTraffic: 20, maxTraffic: 65 },
]

/**
 * Arbitrary for Graph chart data.
 * Generates 18 nodes and 30 weighted links across 5 network & service tiers.
 */
export const graphChartArbitrary: fc.Arbitrary<GraphSample> = fc
  .tuple(
    ...TOPOLOGY_EDGES.map(edge =>
      fc.integer({ min: edge.minTraffic, max: edge.maxTraffic }),
    ),
  )
  .map((trafficValues): GraphSample => ({
    type: 'graph',
    data: R.pipe(
      R.zip(TOPOLOGY_EDGES, trafficValues),
      R.map(([edge, traffic]): GraphLinkSample => ({
        source: edge.source,
        target: edge.target,
        traffic,
        zone: edge.zone,
      })),
    ),
  }))
