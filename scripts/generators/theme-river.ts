import * as fc from 'fast-check'
import * as R from 'remeda'
import { Temporal } from 'temporal-polyfill'
import { NEWS_TOPICS } from './themes'

// Fixed rather than Temporal.Now.plainDateISO() -- same ANCHOR_DATE fix as
// gantt.ts/heatmap.ts's calendar arbitrary, so getDeterministicSample stays
// reproducible across days.
const ANCHOR_DATE = Temporal.PlainDate.from('2024-01-01')
const DAY_COUNT = 30

const DATES = Array.from(
  { length: DAY_COUNT },
  (_, i) => ANCHOR_DATE.add({ days: i }).toString(),
)

// Every Date x Topic combination, generated once so sampled mention counts
// can be paired onto it via R.zip below -- same cross-product technique as
// heatmap.ts's DAY_HOUR_COMBINATIONS.
const DATE_TOPIC_COMBINATIONS = DATES.flatMap(date =>
  NEWS_TOPICS.map(topic => ({ date, topic })))

/**
 * Arbitrary for Theme River chart data.
 * Generates mention counts for a Date x Topic cross-product.
 */
export const themeRiverChartArbitrary = fc.record({
  maxVal: fc.integer({ min: 20,
    max: 100 }),
}).chain((config) => {
  return fc.array(
    fc.integer({ min: 0,
      max: config.maxVal }),
    { minLength: DATE_TOPIC_COMBINATIONS.length,
      maxLength: DATE_TOPIC_COMBINATIONS.length },
  ).map((values) => {
    const data = R.zip(DATE_TOPIC_COMBINATIONS, values).map(([combo, mentions]) => ({
      date: combo.date,
      topic: combo.topic,
      mentions,
    }))

    return {
      type: 'themeRiver',
      data,
    }
  })
})
