import * as fc from 'fast-check'
import * as R from 'remeda'
import { KEYWORDS, themeSubset } from './themes'

/**
 * Arbitrary for Word Cloud chart data.
 * Selects a random subset of KEYWORDS and assigns each a frequency.
 */
export const wordCloudChartArbitrary = themeSubset(
  KEYWORDS,
  20,
).chain((words) => {
  return fc.array(
    fc.integer({ min: 10,
      max: 100 }),
    { minLength: words.length,
      maxLength: words.length },
  ).map((frequencies) => {
    const data = R.pipe(
      R.zip(words, frequencies),
      R.map(([word, frequency]) => ({ word, frequency })),
    )

    return {
      type: 'wordCloud',
      data,
    }
  })
})
