import * as fc from 'fast-check'

export interface GaugeSample {
  readonly date: string
  readonly steps: number
  readonly weight: number
  readonly sleepScore: number
  readonly waterIntake: number
}

const START_DATE = Temporal.PlainDate.from('2026-10-01')

const sampleArbitrary = (dayOffset: number): fc.Arbitrary<GaugeSample> =>
  fc.record({
    date: fc.constant(START_DATE.add({ days: dayOffset }).toString()),
    steps: fc.integer({ min: 4000, max: 13500 }),
    weight: fc.integer({ min: 680, max: 740 }).map(w => w / 10),
    sleepScore: fc.integer({ min: 55, max: 95 }),
    waterIntake: fc.integer({ min: 1500, max: 3200 }),
  })

export const gaugeChartArbitrary: fc.Arbitrary<readonly GaugeSample[]> = fc.tuple(
  sampleArbitrary(0),
  sampleArbitrary(1),
  sampleArbitrary(2),
  sampleArbitrary(3),
  sampleArbitrary(4),
  sampleArbitrary(5),
  sampleArbitrary(6),
  sampleArbitrary(7),
  sampleArbitrary(8),
  sampleArbitrary(9),
  sampleArbitrary(10),
  sampleArbitrary(11),
  sampleArbitrary(12),
  sampleArbitrary(13),
)
