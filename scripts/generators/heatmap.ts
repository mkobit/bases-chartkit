import * as fc from 'fast-check'
import { Temporal } from 'temporal-polyfill'
import { WEEK_DAYS } from './themes'

/**
 * Arbitrary for Heatmap data.
 * Generates data for a Day vs Hour heatmap.
 */
export const heatmapChartArbitrary = fc.record({
  maxVal: fc.integer({ min: 10,
    max: 100 }),
}).chain((config) => {
  const hours = [
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

  // We want to generate a value for every combination of Day + Hour
  return fc.array(
    fc.integer({ min: 0,
      max: config.maxVal }),
    { minLength: WEEK_DAYS.length * hours.length,
      maxLength: WEEK_DAYS.length * hours.length },
  ).map((values) => {
    const data = WEEK_DAYS.flatMap((day, dayIndex) => {
      return hours.map((hour, hourIndex) => {
        const index = dayIndex * hours.length + hourIndex
        return {
          day,
          hour,
          activity: values[index],
        }
      })
    })

    return {
      type: 'heatmap',
      data,
    }
  })
})

/**
 * Arbitrary for Calendar data.
 * Generates daily values for the current year.
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
    const today = Temporal.Now.plainDateISO()
    const yearStart = Temporal.PlainDate.from({ year: today.year,
      month: 1,
      day: 1 })

    const data = values.map((val, i) => {
      const date = yearStart.add({ days: i }).toString()
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
