import { z } from 'zod'
import { Temporal } from 'temporal-polyfill'
import { createNote } from '../../vault'
import type { NoteDefinition } from '../../vault'

export const GanttRecordSchema = z.object({
  Task: z.string(),
  Start: z.instanceof(Temporal.PlainDate),
  End: z.instanceof(Temporal.PlainDate),
  Category: z.enum(['Planning', 'Development', 'Testing', 'Deployment']),
  Status: z.enum(['To Do', 'In Progress', 'Done']),
}).readonly()

export type GanttRecord = z.infer<typeof GanttRecordSchema>

const rawGantt = [
  { Task: 'Project Kickoff', Start: '2024-01-01', End: '2024-01-05', Category: 'Planning', Status: 'Done' },
  { Task: 'Requirements Gathering', Start: '2024-01-06', End: '2024-01-15', Category: 'Planning', Status: 'Done' },
  { Task: 'System Design', Start: '2024-01-16', End: '2024-01-30', Category: 'Planning', Status: 'In Progress' },
  { Task: 'Frontend Development', Start: '2024-02-01', End: '2024-02-28', Category: 'Development', Status: 'To Do' },
  { Task: 'Backend API', Start: '2024-02-01', End: '2024-03-15', Category: 'Development', Status: 'To Do' },
  { Task: 'Integration Testing', Start: '2024-03-16', End: '2024-03-31', Category: 'Testing', Status: 'To Do' },
  { Task: 'User Acceptance Testing', Start: '2024-04-01', End: '2024-04-15', Category: 'Testing', Status: 'To Do' },
  { Task: 'Production Deployment', Start: '2024-04-16', End: '2024-04-20', Category: 'Deployment', Status: 'To Do' },
] as const

export const ganttDataset: readonly NoteDefinition[] = rawGantt.map((record, index) => {
  const typedRecord: GanttRecord = {
    Task: record.Task,
    Start: Temporal.PlainDate.from(record.Start),
    End: Temporal.PlainDate.from(record.End),
    Category: record.Category,
    Status: record.Status,
  }
  return createNote(`Task-${index + 1}.md`, GanttRecordSchema.parse(typedRecord))
})
