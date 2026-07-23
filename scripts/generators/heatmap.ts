import * as fc from 'fast-check'
import * as R from 'remeda'
import { Temporal } from 'temporal-polyfill'
import { WEEK_DAYS } from './themes'

const HOURS = [
  '00:00',
  '01:00',
  '02:00',
  '03:00',
  '04:00',
  '05:00',
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
]

// Every Day x Hour combination, generated once (order fixed by WEEK_DAYS/
// HOURS) so sampled activity values can be paired onto it via R.zip below --
// same technique as bar.ts's QUARTER_REGION_COMBINATIONS fix, avoids
// positional `values[index]` indexing, which would type as `number |
// undefined` under this repo's noUncheckedIndexedAccess.
const DAY_HOUR_COMBINATIONS = WEEK_DAYS.flatMap(day =>
  HOURS.map(hour => ({ day, hour })))

/**
 * Arbitrary for Heatmap data.
 * Generates data for a Day vs Hour heatmap.
 */
export const heatmapChartArbitrary = fc.record({
  maxVal: fc.integer({ min: 10,
    max: 100 }),
}).chain((config) => {
  // We want to generate a value for every combination of Day + Hour
  return fc.array(
    fc.integer({ min: 0,
      max: config.maxVal }),
    { minLength: DAY_HOUR_COMBINATIONS.length,
      maxLength: DAY_HOUR_COMBINATIONS.length },
  ).map((values) => {
    const data = R.zip(DAY_HOUR_COMBINATIONS, values).map(([combo, activity]) => ({
      day: combo.day,
      hour: combo.hour,
      activity,
    }))

    return {
      type: 'heatmap',
      data,
    }
  })
})

// Fixed rather than Temporal.Now.plainDateISO() -- a wall-clock anchor made
// this arbitrary non-deterministic across days despite the seeded sampling,
// defeating the whole point of `getDeterministicSample` (same class of bug
// already fixed in line.ts's ANCHOR_DATE).
const CALENDAR_YEAR_START = Temporal.PlainDate.from('2024-01-01')

/**
 * Arbitrary for Calendar data.
 * Generates daily values for a fixed year.
 */
export const calendarChartArbitrary = fc.record({
  minVal: fc.integer({ min: 0,
    max: 100 }),
  maxVal: fc.integer({ min: 200,
    max: 500 }),
}).chain((config) => {
  // Generate data for 365 days
  return fc.array(
    fc.integer({ min: config.minVal,
      max: config.maxVal }),
    { minLength: 365,
      maxLength: 366 },
  ).map((values) => {
    const data = values.map((val, i) => {
      const date = CALENDAR_YEAR_START.add({ days: i }).toString()
      return {
        date,
        commits: val,
      }
    })

    return {
      type: 'calendar',
      data,
    }
  })
})
