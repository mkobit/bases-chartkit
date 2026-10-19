import * as fc from 'fast-check'
import * as R from 'remeda'

const CLASSES = [
  'Warrior',
  'Wizard',
  'Rogue',
  'Ranger',
  'Cleric',
  'Bard',
  'Paladin',
  'Druid',
  'Monk',
  'Sorcerer',
  'Barbarian',
  'Warlock',
] as const

const CHARACTER_NAMES = [
  'Conan',
  'Gandalf',
  'Locke',
  'Elowen',
  'Draven',
  'Tamsin',
  'Aric',
  'Lyra',
  'Boran',
  'Thorne',
  'Kaelen',
  'Morrigan',
] as const

export const INDICATORS = [
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
] as const

/**
 * Arbitrary for radar chart data.
 * Each row is one character in wide format.
 * Natural stat variance models standard fantasy attribute rolls.
 */
export const radarChartArbitrary = fc
  .subarray([...CHARACTER_NAMES], { minLength: 8, maxLength: 12 })
  .chain((names) => {
    return fc.tuple(
      ...names.map(() => fc.tuple(
        fc.constantFrom(...CLASSES),
        fc.integer({ min: 3, max: 18 }),
        fc.integer({ min: 3, max: 18 }),
        fc.integer({ min: 3, max: 18 }),
        fc.integer({ min: 3, max: 18 }),
        fc.integer({ min: 3, max: 18 }),
        fc.integer({ min: 3, max: 18 }),
      )),
    ).map((rolls) => {
      const data = R.pipe(
        R.zip(names, rolls),
        R.map(([name, [characterClass, strength, dexterity, constitution, intelligence, wisdom, charisma]]) => ({
          name,
          class: characterClass,
          Strength: strength,
          Dexterity: dexterity,
          Constitution: constitution,
          Intelligence: intelligence,
          Wisdom: wisdom,
          Charisma: charisma,
          Agility: dexterity,
        })),
      )

      return {
        type: 'radar',
        data,
      }
    })
  })
