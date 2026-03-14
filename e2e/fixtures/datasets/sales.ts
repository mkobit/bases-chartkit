import { z } from 'zod'
import { createNote } from '../../vault'
import type { NoteDefinition } from '../../vault'

export const SalesRecordSchema = z.object({
  Date: z.string(),
  Product: z.enum(['Widget A', 'Widget B', 'Widget C']),
  Revenue: z.number(),
  Units: z.number(),
  Region: z.enum(['North', 'South', 'East', 'West']),
}).readonly()

export type SalesRecord = z.infer<typeof SalesRecordSchema>

const rawSales: readonly SalesRecord[] = [
  { Date: '2023-01-01', Product: 'Widget A', Revenue: 45_000, Units: 150, Region: 'North' },
  { Date: '2023-02-01', Product: 'Widget B', Revenue: 52_000, Units: 180, Region: 'South' },
  { Date: '2023-03-01', Product: 'Widget C', Revenue: 38_000, Units: 120, Region: 'East' },
  { Date: '2023-04-01', Product: 'Widget A', Revenue: 47_000, Units: 160, Region: 'West' },
  { Date: '2023-05-01', Product: 'Widget B', Revenue: 55_000, Units: 190, Region: 'North' },
  { Date: '2023-06-01', Product: 'Widget C', Revenue: 41_000, Units: 130, Region: 'South' },
  { Date: '2023-07-01', Product: 'Widget A', Revenue: 49_000, Units: 170, Region: 'East' },
  { Date: '2023-08-01', Product: 'Widget B', Revenue: 58_000, Units: 200, Region: 'West' },
  { Date: '2023-09-01', Product: 'Widget C', Revenue: 44_000, Units: 140, Region: 'North' },
  { Date: '2023-10-01', Product: 'Widget A', Revenue: 51_000, Units: 180, Region: 'South' },
]

export const salesDataset: readonly NoteDefinition[] = rawSales.map(record =>
  createNote(`Sales-${record.Date.slice(0, 7)}.md`, SalesRecordSchema.parse(record)),
)
