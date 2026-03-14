import { z } from 'zod'
import { createNote } from '../../vault'
import type { NoteDefinition } from '../../vault'

export const CountryRecordSchema = z.object({
  Country: z.string(),
  Population: z.number().int(),
  GDP: z.number().int(),
  LifeExpectancy: z.number(),
}).readonly()

export type CountryRecord = z.infer<typeof CountryRecordSchema>

const rawCountries: readonly CountryRecord[] = [
  { Country: 'USA', Population: 331_002_651, GDP: 21_433_226, LifeExpectancy: 78.8 },
  { Country: 'China', Population: 1_439_323_776, GDP: 14_342_903, LifeExpectancy: 76.9 },
  { Country: 'Japan', Population: 126_476_461, GDP: 5_081_770, LifeExpectancy: 84.6 },
  { Country: 'Germany', Population: 83_783_942, GDP: 3_861_123, LifeExpectancy: 81.3 },
  { Country: 'India', Population: 1_380_004_385, GDP: 2_870_504, LifeExpectancy: 69.7 },
  { Country: 'UK', Population: 67_886_011, GDP: 2_829_108, LifeExpectancy: 81.3 },
  { Country: 'France', Population: 65_273_511, GDP: 2_715_518, LifeExpectancy: 82.7 },
  { Country: 'Italy', Population: 60_461_826, GDP: 2_003_576, LifeExpectancy: 83.5 },
  { Country: 'Brazil', Population: 212_559_417, GDP: 1_839_758, LifeExpectancy: 75.9 },
  { Country: 'Canada', Population: 37_742_154, GDP: 1_736_426, LifeExpectancy: 82.4 },
]

export const countryDataset: readonly NoteDefinition[] = rawCountries.map(record =>
  createNote(`Country-${record.Country}.md`, CountryRecordSchema.parse(record)),
)
