import * as fc from 'fast-check'

/**
 * Arbitrary for Radar chart data.
 * Generates multi-series data across indicators.
 */
export const radarChartArbitrary = fc.record({
  indicators: fc.constant(['STR',
    'DEX',
    'CON',
    'INT',
    'WIS',
    'CHA']),
  series: fc.constant(['Paladin',
    'Rogue']),
}).chain((config) => {
  return fc.array(
    fc.integer({ min: 3,
      max: 18 }),
    { minLength: config.indicators.length * config.series.length,
      maxLength: config.indicators.length * config.series.length },
  ).map((values) => {
    const data = config.series.flatMap((series, seriesIndex) => {
      return config.indicators.map((ind, indIndex) => {
        const index = seriesIndex * config.indicators.length + indIndex
        return {
          attribute: ind,
          class: series,
          score: values[index],
        }
      })
    })

    return {
      type: 'radar',
      data,
    }
  })
})
