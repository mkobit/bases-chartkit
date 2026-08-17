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

// 2024 is a leap year (366 days), so a bare arbitrary spans a full calendar.
const CALENDAR_DAYS = 366
// First cell is pinned to a fixed mood so the e2e can assert a stable value at
// dataIndex 0 (2024-01-01) without depending on the sampled noise draw.
const FIRST_DAY_MOOD = 3

/**
 * Arbitrary for Calendar data.
 *
 * Models a year-long daily mood journal on a 1..5 scale (1 = rough, 5 = great)
 * -- the calendar's magnitude maps onto the sequential ramp, so higher mood
 * reads as darker. The shape carries real, legible variance rather than a flat
 * or spiky field: weekends run happier than workdays, a seasonal sine lifts
 * summer and dips midwinter, and per-day noise keeps adjacent cells from
 * banding into solid blocks. Values stay clamped to 1..5 so the label and the
 * data agree (the old generator emitted "Mood" counts up to ~300, which read
 * as an activity heatmap mislabelled as mood).
 */
export const calendarChartArbitrary = fc.array(
  fc.integer({ min: -1,
    max: 1 }),
  { minLength: CALENDAR_DAYS,
    maxLength: CALENDAR_DAYS },
).map((noise) => {
  const data = noise.map((jitter, i) => {
    const plainDate = CALENDAR_YEAR_START.add({ days: i })
    const date = plainDate.toString()
    const isWeekend = plainDate.dayOfWeek >= 6 // 6 (Sat), 7 (Sun)
    // Peaks near midsummer (~day 172), troughs midwinter -- amplitude ~0.9 of a
    // mood point so the season shifts the baseline without pinning the extremes.
    const seasonal = 0.9 * Math.sin((2 * Math.PI * (plainDate.dayOfYear - 80)) / CALENDAR_DAYS)
    const baseline = isWeekend ? 4 : 3
    const raw = Math.round(baseline + seasonal + jitter)
    const mood = i === 0 ? FIRST_DAY_MOOD : Math.max(1, Math.min(5, raw))

    return {
      date,
      mood,
    }
  })

  return {
    type: 'calendar',
    data,
  }
})
