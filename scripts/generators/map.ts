import * as fc from 'fast-check'
import * as R from 'remeda'
import { CHICAGO_EVENT_TYPES } from './themes'

export const CHICAGO_SEASONS = [
  'Peak Summer',
  'Year-Round',
  'Spring-Fall',
] as const

export type ChicagoSeason = (typeof CHICAGO_SEASONS)[number]

interface LandmarkLocation {
  readonly name: string
  readonly lat: number
  readonly lon: number
  readonly category: string
  readonly season: ChicagoSeason
  readonly attendanceRange: readonly [number, number]
  readonly ticketPriceRange: readonly [number, number]
  readonly ratingRange: readonly [number, number]
}

export interface MapLandmarkRow {
  readonly landmark: string
  readonly lat: number
  readonly lon: number
  readonly category: string
  readonly season: ChicagoSeason
  readonly eventType: string
  readonly eventCount: number
  readonly attendance: number
  readonly rating: number
  readonly ticketPrice: number
}

export interface MapSample {
  readonly type: string
  readonly data: readonly MapLandmarkRow[]
}

// Real feature names from bases-chartkit-example-vault/map/assets/
// chicago-landmarks.geo.json ('Chicago' itself is the map's boundary
// feature, not a landmark, so it's excluded here). Fixed rather than
// sampled -- a fabricated or misspelled name wouldn't resolve to any region
// in the registered GeoJSON, leaving it unhighlighted on the map.
export const CHICAGO_LANDMARKS: readonly LandmarkLocation[] = [
  {
    name: 'Millennium Park',
    lat: 41.882702,
    lon: -87.619392,
    category: 'Civic Park',
    season: 'Peak Summer',
    attendanceRange: [320_000, 480_000],
    ticketPriceRange: [20, 45],
    ratingRange: [46, 49],
  },
  {
    name: 'Navy Pier',
    lat: 41.892654,
    lon: -87.610168,
    category: 'Waterfront Pier',
    season: 'Year-Round',
    attendanceRange: [480_000, 680_000],
    ticketPriceRange: [35, 65],
    ratingRange: [43, 46],
  },
  {
    name: 'Wrigley Field',
    lat: 41.948463,
    lon: -87.6558,
    category: 'Historic Stadium',
    season: 'Spring-Fall',
    attendanceRange: [220_000, 340_000],
    ticketPriceRange: [95, 145],
    ratingRange: [47, 49],
  },
  {
    name: 'Grant Park',
    lat: 41.876465,
    lon: -87.621887,
    category: 'Festival Grounds',
    season: 'Peak Summer',
    attendanceRange: [550_000, 780_000],
    ticketPriceRange: [60, 110],
    ratingRange: [45, 48],
  },
  {
    name: 'Lincoln Park',
    lat: 41.927826,
    lon: -87.652016,
    category: 'Nature & Conservatory',
    season: 'Year-Round',
    attendanceRange: [95_000, 165_000],
    ticketPriceRange: [10, 25],
    ratingRange: [44, 47],
  },
]

const extraMetricsArbitrary = fc.tuple(
  ...CHICAGO_LANDMARKS.map(landmark =>
    fc.tuple(
      fc.integer({ min: landmark.attendanceRange[0], max: landmark.attendanceRange[1] }),
      fc.integer({ min: landmark.ratingRange[0], max: landmark.ratingRange[1] }),
      fc.integer({ min: landmark.ticketPriceRange[0], max: landmark.ticketPriceRange[1] }),
    ),
  ),
)

/**
 * Arbitrary for Map chart data.
 * Every real GeoJSON landmark gets an EventType, EventCount, Attendance,
 * Rating, TicketPrice, Category, and Season; per-landmark identity and
 * coordinates are fixed so every row resolves to a real GeoJSON feature.
 */
export const mapChartArbitrary: fc.Arbitrary<MapSample> = fc.array(
  fc.tuple(
    fc.constantFrom(...CHICAGO_EVENT_TYPES),
    fc.integer({ min: 15,
      max: 150 }),
  ),
  { minLength: CHICAGO_LANDMARKS.length,
    maxLength: CHICAGO_LANDMARKS.length },
).chain(rolls =>
  extraMetricsArbitrary.map((extraRolls) => {
    const data = R.pipe(
      R.zip(CHICAGO_LANDMARKS, R.zip(rolls, extraRolls)),
      R.map(([landmark, [[eventType, eventCount], [attendance, ratingTenths, ticketPrice]]]): MapLandmarkRow => ({
        landmark: landmark.name,
        lat: landmark.lat,
        lon: landmark.lon,
        category: landmark.category,
        season: landmark.season,
        eventType,
        eventCount,
        attendance,
        rating: ratingTenths / 10,
        ticketPrice,
      })),
    )

    return {
      type: 'map',
      data,
    }
  }),
)
