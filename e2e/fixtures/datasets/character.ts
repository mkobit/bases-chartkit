import { z } from 'zod'
import { createNote } from '../../vault'
import type { NoteDefinition } from '../../vault'

export const CharacterRecordSchema = z.object({
  Name: z.string(),
  Class: z.enum(['Warrior', 'Mage', 'Rogue', 'Cleric', 'Paladin', 'Ranger']),
  Strength: z.number().int(),
  Agility: z.number().int(),
  Intelligence: z.number().int(),
  Defense: z.number().int(),
  HP: z.number().int(),
}).readonly()

export type CharacterRecord = z.infer<typeof CharacterRecordSchema>

const rawCharacters: readonly CharacterRecord[] = [
  { Name: 'Grom', Class: 'Warrior', Strength: 18, Agility: 10, Intelligence: 8, Defense: 16, HP: 150 },
  { Name: 'Elara', Class: 'Mage', Strength: 6, Agility: 12, Intelligence: 20, Defense: 8, HP: 80 },
  { Name: 'Sylas', Class: 'Rogue', Strength: 10, Agility: 18, Intelligence: 12, Defense: 10, HP: 100 },
  { Name: 'Bran', Class: 'Cleric', Strength: 12, Agility: 10, Intelligence: 16, Defense: 14, HP: 120 },
  { Name: 'Kael', Class: 'Paladin', Strength: 16, Agility: 8, Intelligence: 14, Defense: 18, HP: 140 },
  { Name: 'Lyra', Class: 'Ranger', Strength: 12, Agility: 16, Intelligence: 10, Defense: 12, HP: 110 },
]

export const characterDataset: readonly NoteDefinition[] = rawCharacters.map(record =>
  createNote(`Char-${record.Class}.md`, CharacterRecordSchema.parse(record)),
)
