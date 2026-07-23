import * as fc from 'fast-check'
import * as R from 'remeda'
import { CHICAGO_EVENT_TYPES } from './themes'

interface LandmarkLocation {
  readonly name: string
  readonly lat: number
  readonly lon: number
}

// Real feature names from bases-chartkit-example-vault/map/assets/
// chicago-landmarks.geo.json ('Chicago' itself is the map's boundary
// feature, not a landmark, so it's excluded here). Fixed rather than
// sampled -- a fabricated or misspelled name wouldn't resolve to any region
// in the registered GeoJSON, leaving it unhighlighted on the map.
const CHICAGO_LANDMARKS: readonly LandmarkLocation[] = [
  { name: 'Millennium Park', lat: 41.882702, lon: -87.619392 },
  { name: 'Navy Pier', lat: 41.892654, lon: -87.610168 },
  { name: 'Wrigley Field', lat: 41.948463, lon: -87.6558 },
  { name: 'Grant Park', lat: 41.876465, lon: -87.621887 },
  { name: 'Lincoln Park', lat: 41.927826, lon: -87.652016 },
]

/**
 * Arbitrary for Map chart data.
 * Every real GeoJSON landmark gets an EventType and EventCount; only those
 * two fields are randomized, per-landmark identity and coordinates are fixed.
 */
export const mapChartArbitrary = fc.array(
  fc.tuple(
    fc.constantFrom(...CHICAGO_EVENT_TYPES),
    fc.integer({ min: 5,
      max: 30 }),
  ),
  { minLength: CHICAGO_LANDMARKS.length,
    maxLength: CHICAGO_LANDMARKS.length },
).map((rolls) => {
  const data = R.pipe(
    R.zip(CHICAGO_LANDMARKS, rolls),
    R.map(([landmark, [eventType, eventCount]]) => ({
      landmark: landmark.name,
      lat: landmark.lat,
      lon: landmark.lon,
      eventType,
      eventCount,
    })),
  )

  return {
    type: 'map',
    data,
  }
})
