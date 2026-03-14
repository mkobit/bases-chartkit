import { z } from 'zod'
import { Temporal } from 'temporal-polyfill'
import { createNote } from '../../vault'
import type { NoteDefinition } from '../../vault'

export const StockRecordSchema = z.object({
  Date: z.instanceof(Temporal.PlainDate),
  Open: z.number().min(0),
  High: z.number().min(0),
  Low: z.number().min(0),
  Close: z.number().min(0),
  Volume: z.number().int().min(0),
}).readonly()

export type StockRecord = z.infer<typeof StockRecordSchema>

const rawStocks: readonly StockRecord[] = [
  { Date: Temporal.PlainDate.from('2024-01-02'), Open: 187.15, High: 188.44, Low: 183.89, Close: 185.64, Volume: 82_488_700 },
  { Date: Temporal.PlainDate.from('2024-01-03'), Open: 184.22, High: 185.88, Low: 183.43, Close: 184.25, Volume: 58_414_500 },
  { Date: Temporal.PlainDate.from('2024-01-04'), Open: 182.15, High: 183.09, Low: 180.88, Close: 181.91, Volume: 71_983_600 },
  { Date: Temporal.PlainDate.from('2024-01-05'), Open: 181.99, High: 182.76, Low: 180.17, Close: 181.18, Volume: 62_303_300 },
  { Date: Temporal.PlainDate.from('2024-01-08'), Open: 182.09, High: 185.60, Low: 181.50, Close: 185.56, Volume: 59_144_500 },
  { Date: Temporal.PlainDate.from('2024-01-09'), Open: 183.92, High: 185.15, Low: 182.73, Close: 185.14, Volume: 42_841_800 },
  { Date: Temporal.PlainDate.from('2024-01-10'), Open: 184.35, High: 186.40, Low: 183.92, Close: 186.19, Volume: 46_792_900 },
  { Date: Temporal.PlainDate.from('2024-01-11'), Open: 186.54, High: 187.05, Low: 183.62, Close: 185.59, Volume: 49_128_400 },
  { Date: Temporal.PlainDate.from('2024-01-12'), Open: 186.06, High: 186.74, Low: 185.19, Close: 185.92, Volume: 40_444_700 },
  { Date: Temporal.PlainDate.from('2024-01-16'), Open: 182.16, High: 184.26, Low: 180.93, Close: 183.63, Volume: 65_603_000 },
  { Date: Temporal.PlainDate.from('2024-01-17'), Open: 181.27, High: 182.93, Low: 180.30, Close: 182.68, Volume: 47_317_400 },
  { Date: Temporal.PlainDate.from('2024-01-18'), Open: 186.09, High: 189.14, Low: 185.83, Close: 188.63, Volume: 78_005_800 },
  { Date: Temporal.PlainDate.from('2024-01-19'), Open: 189.33, High: 191.95, Low: 188.82, Close: 191.56, Volume: 68_741_000 },
  { Date: Temporal.PlainDate.from('2024-01-22'), Open: 192.30, High: 195.33, Low: 192.26, Close: 193.89, Volume: 60_133_900 },
  { Date: Temporal.PlainDate.from('2024-01-23'), Open: 195.02, High: 195.75, Low: 193.83, Close: 195.18, Volume: 42_355_600 },
  { Date: Temporal.PlainDate.from('2024-01-24'), Open: 195.42, High: 196.38, Low: 194.34, Close: 194.50, Volume: 53_631_300 },
  { Date: Temporal.PlainDate.from('2024-01-25'), Open: 195.22, High: 196.27, Low: 193.11, Close: 194.17, Volume: 54_822_100 },
  { Date: Temporal.PlainDate.from('2024-01-26'), Open: 194.27, High: 194.76, Low: 191.94, Close: 192.42, Volume: 44_594_000 },
  { Date: Temporal.PlainDate.from('2024-01-29'), Open: 192.01, High: 192.20, Low: 189.58, Close: 191.73, Volume: 47_145_600 },
  { Date: Temporal.PlainDate.from('2024-01-30'), Open: 190.94, High: 191.80, Low: 187.47, Close: 188.04, Volume: 55_859_400 },
]

export const stockDataset: readonly NoteDefinition[] = rawStocks.map(record =>
  createNote(`Stocks/Stock-${record.Date.toString()}.md`, StockRecordSchema.parse(record)),
)
