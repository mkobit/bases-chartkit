import { z } from 'zod'
import { Temporal } from 'temporal-polyfill'
import { createNote } from '../../vault'
import type { NoteDefinition } from '../../vault'

export const ServerMetricsRecordSchema = z.object({
  Server: z.enum(['Server A', 'Server B', 'Server C']),
  Date: z.instanceof(Temporal.Instant),
  CPU: z.number().min(0).max(100),
  Memory: z.number().min(0).max(100),
  Requests: z.number().int().min(0),
}).readonly()

export type ServerMetricsRecord = z.infer<typeof ServerMetricsRecordSchema>

const rawServerMetrics: readonly ServerMetricsRecord[] = [
  { Server: 'Server A', Date: Temporal.Instant.from('2023-11-01T00:00:00Z'), CPU: 25, Memory: 40, Requests: 1500 },
  { Server: 'Server A', Date: Temporal.Instant.from('2023-11-01T04:00:00Z'), CPU: 30, Memory: 45, Requests: 1800 },
  { Server: 'Server A', Date: Temporal.Instant.from('2023-11-01T08:00:00Z'), CPU: 65, Memory: 70, Requests: 5500 },
  { Server: 'Server A', Date: Temporal.Instant.from('2023-11-01T12:00:00Z'), CPU: 85, Memory: 85, Requests: 8000 },
  { Server: 'Server A', Date: Temporal.Instant.from('2023-11-01T16:00:00Z'), CPU: 75, Memory: 80, Requests: 6500 },
  { Server: 'Server A', Date: Temporal.Instant.from('2023-11-01T20:00:00Z'), CPU: 50, Memory: 60, Requests: 4000 },
  { Server: 'Server B', Date: Temporal.Instant.from('2023-11-01T00:00:00Z'), CPU: 20, Memory: 35, Requests: 1200 },
  { Server: 'Server B', Date: Temporal.Instant.from('2023-11-01T04:00:00Z'), CPU: 22, Memory: 38, Requests: 1400 },
  { Server: 'Server B', Date: Temporal.Instant.from('2023-11-01T08:00:00Z'), CPU: 55, Memory: 65, Requests: 4800 },
  { Server: 'Server B', Date: Temporal.Instant.from('2023-11-01T12:00:00Z'), CPU: 70, Memory: 75, Requests: 7000 },
  { Server: 'Server B', Date: Temporal.Instant.from('2023-11-01T16:00:00Z'), CPU: 60, Memory: 70, Requests: 5800 },
  { Server: 'Server B', Date: Temporal.Instant.from('2023-11-01T20:00:00Z'), CPU: 45, Memory: 55, Requests: 3500 },
  { Server: 'Server C', Date: Temporal.Instant.from('2023-11-01T00:00:00Z'), CPU: 15, Memory: 30, Requests: 800 },
  { Server: 'Server C', Date: Temporal.Instant.from('2023-11-01T04:00:00Z'), CPU: 18, Memory: 32, Requests: 1000 },
  { Server: 'Server C', Date: Temporal.Instant.from('2023-11-01T08:00:00Z'), CPU: 40, Memory: 50, Requests: 3500 },
  { Server: 'Server C', Date: Temporal.Instant.from('2023-11-01T12:00:00Z'), CPU: 55, Memory: 60, Requests: 5500 },
  { Server: 'Server C', Date: Temporal.Instant.from('2023-11-01T16:00:00Z'), CPU: 45, Memory: 55, Requests: 4200 },
  { Server: 'Server C', Date: Temporal.Instant.from('2023-11-01T20:00:00Z'), CPU: 30, Memory: 40, Requests: 2500 },
  { Server: 'Server A', Date: Temporal.Instant.from('2023-11-01T23:59:59Z'), CPU: 55, Memory: 63.3, Requests: 27_300 },
  { Server: 'Server B', Date: Temporal.Instant.from('2023-11-01T23:59:59Z'), CPU: 45.6, Memory: 56.3, Requests: 23_700 },
]

export const serverMetricsDataset: readonly NoteDefinition[] = rawServerMetrics.map((record) => {
  const zdt = record.Date.toZonedDateTimeISO('UTC')
  const isSummary = zdt.hour === 23 && zdt.minute === 59 && zdt.second === 59
  const timeStr = `${zdt.hour.toString().padStart(2, '0')}${zdt.minute.toString().padStart(2, '0')}`
  const fileName = isSummary
    ? `${record.Server.replace(' ', '')}-Summary.md`
    : `${record.Server.replace(' ', '')}-${timeStr}.md`

  return createNote(`Metrics/${fileName}`, ServerMetricsRecordSchema.parse(record))
})
