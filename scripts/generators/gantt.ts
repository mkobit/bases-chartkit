import * as fc from 'fast-check'
import * as R from 'remeda'
import { GANTT_DELIVERABLES, GANTT_PHASES, GANTT_PROJECTS, themeSubset } from './themes'

// Fixed rather than Temporal.Now.plainDateISO() -- a wall-clock anchor made
// line.ts's arbitrary non-deterministic across days despite the seeded
// sampling, defeating the whole point of getDeterministicSample.
const ANCHOR_DATE = Temporal.PlainDate.from('2024-01-01')

/**
 * Arbitrary for a phased Gantt chart dataset.
 * Selects 3-4 projects and 8-12 deliverables, then walks each deliverable
 * through every lifecycle phase (Plan -> Develop -> Test -> Release) as a
 * contiguous span: a phase's end is the next phase's start, so one deliverable
 * renders as a single multi-color task line. Durations come from fc.integer
 * (not fc.float) to avoid near-zero/NaN degeneracy under numRuns: 1 sampling;
 * Develop is the longest phase to mirror real project shape.
 */
export const ganttChartArbitrary = fc.record({
  projects: themeSubset(GANTT_PROJECTS, 3),
  deliverables: fc.subarray(GANTT_DELIVERABLES, { minLength: 8, maxLength: 12 }),
}).chain(({ projects, deliverables }) => {
  return fc.record({
    deliverables: fc.constant(deliverables),
    details: fc.array(
      fc.tuple(
        fc.constantFrom(...projects),
        fc.integer({ min: 0, max: 180 }), // start offset, in days, from the anchor
        fc.tuple(
          fc.integer({ min: 5, max: 18 }), // Plan
          fc.integer({ min: 15, max: 45 }), // Develop (longest)
          fc.integer({ min: 8, max: 24 }), // Test
          fc.integer({ min: 3, max: 12 }), // Release
        ),
      ),
      { minLength: deliverables.length, maxLength: deliverables.length },
    ),
  })
}).map(({ deliverables, details }) => {
  const data = R.pipe(
    R.zip(deliverables, details),
    R.flatMap(([deliverable, [project, startOffsetDays, durations]]) =>
      R.zip(GANTT_PHASES, durations).map(([phase, durationDays], phaseIndex) => {
        // Contiguous: this phase starts after every prior phase's duration, so
        // Plan/Develop/Test/Release abut end-to-end on the deliverable's line.
        const daysBefore = R.sum(R.take(durations, phaseIndex))
        const start = ANCHOR_DATE.add({ days: startOffsetDays + daysBefore })
        const end = start.add({ days: durationDays })

        return {
          task: deliverable,
          phase,
          project,
          start: start.toString(),
          end: end.toString(),
        }
      }),
    ),
  )

  return {
    type: 'gantt',
    data,
  }
})
