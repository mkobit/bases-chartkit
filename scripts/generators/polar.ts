import * as fc from 'fast-check'
import * as R from 'remeda'

// A handful of categorical time-of-day buckets, not a full 24-hour grid --
// this is a line/polar chart (angle axis is a small set of categories), not
// a heatmap.ts-scale hourly grid.
const TIME_BUCKETS = ['00:00',
  '03:00',
  '06:00',
  '09:00',
  '12:00',
  '15:00',
  '18:00',
  '21:00']
const SERVERS = ['Server-1',
  'Server-2',
  'Server-3',
  'Server-4']

// Every Time x Server combination, generated once so sampled load values
// can be paired onto it via R.zip below -- same cross-product + R.zip
// technique as heatmap.ts's DAY_HOUR_COMBINATIONS, scaled down to a
// line-chart-sized grid instead of a heatmap-sized one.
const TIME_SERVER_COMBINATIONS = TIME_BUCKETS.flatMap(time =>
  SERVERS.map(server => ({ time, server })))

/**
 * Arbitrary for Polar Line chart data.
 * Generates load values for a Time-bucket x Server cross-product.
 *
 * `load`'s min is 1, not 0: `load` encodes the radius in polar-line.ts's
 * `radiusAxis`, and a radius of exactly 0 sits at the polar chart's literal
 * center -- geometrically the same pixel regardless of which angle
 * (time-of-day category) it belongs to. A hover-based e2e test that targets
 * a specific (time, server) point can't disambiguate which category ECharts'
 * axis-pointer resolves a center hit to (confirmed via bck-44x: hovering
 * TIME_SERVER_COMBINATIONS[0]'s point, generated with load 0, consistently
 * showed the tooltip for a different time bucket entirely). Keeping every
 * point off the exact center removes the ambiguity at the source.
 */
export const polarLineChartArbitrary = fc.record({
  maxVal: fc.integer({ min: 50,
    max: 100 }),
}).chain((config) => {
  return fc.array(
    fc.integer({ min: 1,
      max: config.maxVal }),
    { minLength: TIME_SERVER_COMBINATIONS.length,
      maxLength: TIME_SERVER_COMBINATIONS.length },
  ).map((values) => {
    const data = R.zip(TIME_SERVER_COMBINATIONS, values).map(([combo, load]) => ({
      time: combo.time,
      server: combo.server,
      load,
    }))

    return {
      type: 'polarLine',
      data,
    }
  })
})
