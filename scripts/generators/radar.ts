import * as fc from 'fast-check'
import * as R from 'remeda'
import { FANTASY_CHARACTER_NAMES, themeSubset } from './themes'

const CLASSES = ['Warrior', 'Wizard', 'Rogue', 'Ranger', 'Cleric', 'Bard']
const INDICATORS = ['Strength', 'Intelligence', 'Agility', 'Wisdom', 'Charisma'] as const

/**
 * Arbitrary for Radar chart data.
 * Each row is one character (wide format: one note per entity, each
 * indicator its own field) -- matches how the radar-chart view actually
 * reads data (xAxisProp = entity/series name, metricProps = indicator
 * fields on that same note), not a long "one row per indicator" shape.
 */
export const radarChartArbitrary = themeSubset(
  FANTASY_CHARACTER_NAMES,
  4,
).chain((names) => {
  return fc.tuple(
    ...names.map(() => fc.tuple(
      fc.constantFrom(...CLASSES),
      fc.integer({ min: 3, max: 18 }),
      fc.integer({ min: 3, max: 18 }),
      fc.integer({ min: 3, max: 18 }),
      fc.integer({ min: 3, max: 18 }),
      fc.integer({ min: 3, max: 18 }),
    )),
  ).map((rolls) => {
    const data = R.pipe(
      R.zip(names, rolls),
      R.map(([name, [characterClass, strength, intelligence, agility, wisdom, charisma]]) => ({
        name,
        class: characterClass,
        [INDICATORS[0]]: strength,
        [INDICATORS[1]]: intelligence,
        [INDICATORS[2]]: agility,
        [INDICATORS[3]]: wisdom,
        [INDICATORS[4]]: charisma,
      })),
    )

    return {
      type: 'radar',
      data,
    }
  })
})
