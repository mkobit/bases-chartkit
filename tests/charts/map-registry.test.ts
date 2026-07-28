import { describe, it, expect } from 'bun:test'
import * as echarts from 'echarts'
import { isMapRegistered, acquireMap } from '../../src/charts/map-registry'

describe(
  'map-registry',
  () => {
    it(
      'should register a map on first acquire and report it as registered',
      async () => {
        const name = `test-map-${crypto.randomUUID()}`
        expect(isMapRegistered(name)).toBe(false)

        let loadCount = 0
        await acquireMap(
          name,
          async () => {
            loadCount += 1
            return { type: 'FeatureCollection',
              features: [] }
          },
        )

        expect(isMapRegistered(name)).toBe(true)
        expect(loadCount).toBe(1)
        expect(echarts.getMap(name)).toBeDefined()
      },
    )

    it(
      'should skip the loader entirely when the map is already registered',
      async () => {
        // Reproduces the map-chart bug: switching back to a previously-seen
        // map used to force a fresh vault read + re-parse + re-register
        // every time, even though ECharts already had the geoJson.
        const name = `test-map-${crypto.randomUUID()}`
        let loadCount = 0
        const loader = async () => {
          loadCount += 1
          return { type: 'FeatureCollection' as const,
            features: [] }
        }

        await acquireMap(name, loader)
        await acquireMap(name, loader)
        await acquireMap(name, loader)

        expect(loadCount).toBe(1)
      },
    )
  },
)
