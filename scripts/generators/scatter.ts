import * as fc from 'fast-check'
import * as R from 'remeda'
import { CONTINENTS, themeItem } from './themes'

/**
 * Arbitrary for a basic Scatter chart dataset.
 * Generates X values and corresponding Noise values to combine them deterministically to form a correlated dataset.
 * `noNaN: true` on every fc.float() call below: fast-check's float arbitrary
 * can still draw NaN even with min/max bounds set (confirmed empirically --
 * without this, a deterministic sample at a real registry seed produced a
 * point with `y: NaN`, which would silently corrupt generated frontmatter
 * and break rendering for that point).
 */
export const scatterChartArbitrary = fc.record({
  count: fc.integer({ min: 20,
    max: 50 }),
  slope: fc.float({ min: 0.5,
    max: 2.0,
    noNaN: true }),
  intercept: fc.integer({ min: 10,
    max: 50 }),
}).chain((config) => {
  return fc.array(
    fc.record({
      x: fc.float({ min: 10,
        max: 100,
        noNaN: true }),
      noise: fc.float({ min: -10,
        max: 10,
        noNaN: true }),
    }),
    { minLength: config.count,
      maxLength: config.count },
  ).map((points) => {
    const data = points.map(p => ({
      x: parseFloat(p.x.toFixed(1)),
      y: parseFloat((p.x * config.slope + config.intercept + p.noise).toFixed(1)),
    }))
    return {
      type: 'scatter',
      data,
    }
  })
})

/**
 * Layers a categorical seriesProp (continent) and a real-world-scale
 * sizeProp (population, in millions) on top of scatterChartArbitrary's x/y
 * cloud -- shared by the scatter, effect-scatter, and polar-scatter example
 * specs (each samples this independently via its own chart-type sub-seed,
 * per this migration's one-directory-per-chart-type convention; a given
 * spec's toRows picks only the fields its variants actually bind).
 *
 * Population intentionally spans a realistic country-population range
 * (millions) -- this is the exact magnitude bck-ma9's effect-scatter
 * regression test needs to keep triggering the raw-symbolSize bug (see
 * e2e/effect-scatter-chart-rendering.e2e.ts and effect-scatter's
 * Sized-By-Population variant in vault-gen/registry.ts). Do not shrink this
 * range to "look nicer" -- that would silently defang the regression test.
 */
export const demographicScatterArbitrary = scatterChartArbitrary.chain(scatter => fc.array(
  fc.tuple(
    themeItem(CONTINENTS),
    fc.integer({ min: 5, max: 1400 }),
  ),
  { minLength: scatter.data.length, maxLength: scatter.data.length },
).map(extras => ({
  type: 'scatter',
  data: R.zip(scatter.data, extras).map(([point, [continent, population]]) => ({
    x: point.x,
    y: point.y,
    continent,
    population,
  })),
})))
