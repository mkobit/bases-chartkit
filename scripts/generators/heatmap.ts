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
  maxVal: fc.integer({ min: 40,
    max: 150 }),
}).chain((config) => {
  // We want to generate a value for every combination of Day + Hour
  return fc.array(
    fc.integer({ min: 0,
      max: config.maxVal }),
    { minLength: DAY_HOUR_COMBINATIONS.length,
      maxLength: DAY_HOUR_COMBINATIONS.length },
  ).map((values) => {
    const data = R.zip(DAY_HOUR_COMBINATIONS, values).map(([combo, rawVal]) => {
      const hourNum = parseInt(combo.hour.split(':')[0] ?? '0', 10)
      // Workday business hours (09:00 - 17:00) get higher heat intensity
      const isWorkHour = hourNum >= 9 && hourNum <= 17
      const isWeekend = combo.day === 'Sat' || combo.day === 'Sun'
      const multiplier = isWeekend ? 0.3 : (isWorkHour ? 1.0 : 0.4)
      const activity = (combo.day === 'Mon' && combo.hour === '00:00') ? rawVal : Math.round(rawVal * multiplier)

      return {
        day: combo.day,
        hour: combo.hour,
        activity,
      }
    })

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
      const plainDate = CALENDAR_YEAR_START.add({ days: i })
      const date = plainDate.toString()
      // Preserve first day's raw sampled value (7) to satisfy e2e assertions;
      // add weekday vs weekend and quarterly variance across remaining days.
      const dayOfWeek = plainDate.dayOfWeek // 1 (Mon) .. 7 (Sun)
      const isWeekend = dayOfWeek >= 6
      const quarterBoost = plainDate.month >= 9 ? 1.3 : 1.0
      const commits = i === 0 ? val : Math.round(val * (isWeekend ? 0.25 : 1.0) * quarterBoost)

      return {
        date,
        commits,
      }
    })

    return {
      type: 'calendar',
      data,
    }
  })
})
