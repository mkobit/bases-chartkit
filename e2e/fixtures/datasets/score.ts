import { z } from 'zod'
import { createNote } from '../../vault'
import type { NoteDefinition } from '../../vault'

function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) {
    return 'A'
  }
  if (score >= 80) {
    return 'B'
  }
  if (score >= 70) {
    return 'C'
  }
  if (score >= 60) {
    return 'D'
  }
  return 'F'
}

export const ScoreRecordSchema = z.object({
  Subject: z.enum(['Math', 'Science', 'History']),
  Score: z.number().int().min(0).max(100),
  Student: z.string(),
}).transform((data) => {
  return {
    ...data,
    Grade: calculateGrade(data.Score),
  }
}).readonly()

export type ScoreRecord = z.infer<typeof ScoreRecordSchema>

const rawScores = [
  { Subject: 'Math', Score: 95, Student: 'Alice' },
  { Subject: 'Science', Score: 88, Student: 'Alice' },
  { Subject: 'History', Score: 92, Student: 'Alice' },
  { Subject: 'Math', Score: 78, Student: 'Bob' },
  { Subject: 'Science', Score: 85, Student: 'Bob' },
  { Subject: 'History', Score: 80, Student: 'Bob' },
  { Subject: 'Math', Score: 100, Student: 'Charlie' },
  { Subject: 'Science', Score: 96, Student: 'Charlie' },
  { Subject: 'History', Score: 94, Student: 'Charlie' },
  { Subject: 'Math', Score: 82, Student: 'Diana' },
  { Subject: 'Science', Score: 89, Student: 'Diana' },
  { Subject: 'History', Score: 85, Student: 'Diana' },
  { Subject: 'Math', Score: 91, Student: 'Eve' },
  { Subject: 'Science', Score: 93, Student: 'Eve' },
  { Subject: 'History', Score: 88, Student: 'Eve' },
] as const

export const scoreDataset: readonly NoteDefinition[] = rawScores.map((record) => {
  const parsedRecord = ScoreRecordSchema.parse(record)
  return createNote(`Scores/Score-${parsedRecord.Student}-${parsedRecord.Subject}.md`, parsedRecord)
})
