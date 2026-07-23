import * as fc from 'fast-check'
import * as R from 'remeda'
import { KPI_METRICS, themeSubset } from './themes'

/**
 * Arbitrary for a Bullet chart dataset.
 * Generates 6-10 KPI-style metrics, each with a Value, a Target, and an
 * ascending RangeLow < RangeMid < RangeHigh threshold band. The bullet
 * chart transformer (src/charts/transformers/bullet.ts) treats these three
 * range fields as cumulative thresholds and derives its own stacked deltas
 * internally, so RangeHigh acts as the metric's sensible ceiling (~100).
 * Value and Target are computed as integer percentages against that
 * ceiling rather than sampled directly with fc.float, per this project's
 * "fc.float produces degenerate/NaN samples under numRuns: 1" lesson.
 */
export const bulletChartArbitrary = themeSubset(
  KPI_METRICS,
  6,
).chain((metrics) => {
  return fc.array(
    fc.tuple(
      fc.integer({ min: 30, max: 50 }), // rangeLow
      fc.integer({ min: 15, max: 30 }), // rangeMid offset above rangeLow
      fc.integer({ min: 10, max: 20 }), // rangeHigh offset above rangeMid
      fc.integer({ min: 40, max: 115 }), // value, as a % of rangeHigh
      fc.integer({ min: 0, max: 100 }), // target, interpolated between rangeMid and rangeHigh
    ),
    { minLength: metrics.length, maxLength: metrics.length },
  ).map((rolls) => {
    const data = R.pipe(
      R.zip(metrics, rolls),
      R.map(([metric, [rangeLow, midOffset, highOffset, valuePercent, targetPercent]]) => {
        const rangeMid = rangeLow + midOffset
        const rangeHigh = rangeMid + highOffset
        const value = Math.round(rangeHigh * valuePercent / 100)
        const target = rangeMid + Math.round((rangeHigh - rangeMid) * targetPercent / 100)

        return {
          metric,
          value,
          target,
          rangeLow,
          rangeMid,
          rangeHigh,
        }
      }),
    )

    return {
      type: 'bullet',
      data,
    }
  })
})
