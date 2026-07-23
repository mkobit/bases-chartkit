import * as fc from 'fast-check'
import * as R from 'remeda'
import { Temporal } from 'temporal-polyfill'
import { GANTT_PROJECTS, PROJECT_TASK_NAMES, themeSubset } from './themes'

// Fixed rather than Temporal.Now.plainDateISO() -- a wall-clock anchor made
// line.ts's arbitrary non-deterministic across days despite the seeded
// sampling, defeating the whole point of getDeterministicSample.
const ANCHOR_DATE = Temporal.PlainDate.from('2024-01-01')

/**
 * Arbitrary for a Gantt chart dataset.
 * Selects 3-4 projects and 12-15 distinct task names (fc.subarray guarantees
 * every row is a unique y-axis category -- no two projects share a task
 * label), then assigns each task a project, a start offset from the fixed
 * anchor date, and a duration -- all via fc.integer to avoid fc.float's
 * near-zero/NaN degeneracy under this project's numRuns: 1 sampling.
 */
export const ganttChartArbitrary = fc.record({
  projects: themeSubset(GANTT_PROJECTS, 3),
  tasks: fc.subarray(PROJECT_TASK_NAMES, { minLength: 12, maxLength: 15 }),
}).chain(({ projects, tasks }) => {
  return fc.record({
    tasks: fc.constant(tasks),
    taskDetails: fc.array(
      fc.tuple(
        fc.constantFrom(...projects),
        fc.integer({ min: 0, max: 300 }), // start offset, in days, from the anchor
        fc.integer({ min: 3, max: 21 }), // duration, in days (days to three weeks)
      ),
      { minLength: tasks.length, maxLength: tasks.length },
    ),
  })
}).map(({ tasks, taskDetails }) => {
  const data = R.pipe(
    R.zip(tasks, taskDetails),
    R.map(([task, [project, startOffsetDays, durationDays]]) => {
      const start = ANCHOR_DATE.add({ days: startOffsetDays })
      const end = start.add({ days: durationDays })

      return {
        task,
        project,
        start: start.toString(),
        end: end.toString(),
      }
    }),
  )

  return {
    type: 'gantt',
    data,
  }
})
