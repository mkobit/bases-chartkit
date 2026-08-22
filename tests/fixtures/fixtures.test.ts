import { describe, it, expect } from 'bun:test'
import fc from 'fast-check'
import { Temporal } from 'temporal-polyfill'
import {
  chartDataPointArbitrary,
  chartDatasetArbitrary,
  timeSeriesArbitrary,
  generateLinearData,
  generateDailyTimeSeries,
} from './chart_data'
import { ObsidianFileBuilder } from './obsidian_builder'
import * as R from 'remeda'

// TimePoint.date is a `PlainDate | ZonedDateTime` union; the fixed daily
// generator always produces PlainDate, so this checks the real runtime type
// (instanceof) instead of asserting it.
function asPlainDate(date: Temporal.PlainDate | Temporal.ZonedDateTime | undefined): Temporal.PlainDate {
  if (!(date instanceof Temporal.PlainDate)) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a PlainDate, got ${String(date)}`)
  }
  return date
}

describe(
  'Chart Data Generators',
  () => {
    it(
      'should generate valid random chart data points',
      () => {
        fc.assert(fc.property(
          chartDataPointArbitrary(['price',
            'volume']),
          (data) => {
            expect(data).toHaveProperty('price')
            expect(data).toHaveProperty('volume')
          },
        ))
      },
    )

    it(
      'should generate valid random datasets',
      () => {
        fc.assert(fc.property(
          chartDatasetArbitrary(
            ['x',
              'y'],
            1,
            10,
          ),
          (dataset) => {
            expect(dataset.length).toBeGreaterThanOrEqual(1)
            expect(dataset.length).toBeLessThanOrEqual(10)

            R.forEach(
              dataset,
              (point) => {
                expect(point).toHaveProperty('x')
                expect(point).toHaveProperty('y')
              },
            )
          },
        ))
      },
    )

    it(
      'should generate valid time series data sorted by time',
      () => {
        fc.assert(fc.property(
          timeSeriesArbitrary(),
          (dataset) => {
            expect(dataset.length).toBeGreaterThan(0)

            // Check if sorted using windowed check
            const pairs = R.zip(
              dataset.slice(
                0,
                -1,
              ),
              dataset.slice(1),
            )

            R.forEach(
              pairs,
              ([current,
                next]) => {
                const t1 = current.date
                const t2 = next.date
                if (!(t1 instanceof Temporal.ZonedDateTime) || !(t2 instanceof Temporal.ZonedDateTime)) {
                  // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
                  throw new Error(`expected ZonedDateTime dates, got ${String(t1)} and ${String(t2)}`)
                }
                expect(Temporal.ZonedDateTime.compare(
                  t1,
                  t2,
                )).toBeLessThanOrEqual(0)
              },
            )
          },
        ))
      },
    )

    it(
      'should generate linear fixed data',
      () => {
        const data = generateLinearData(
          5,
          2,
          10,
        )
        expect(data).toHaveLength(5)
        expect(data[0]).toEqual({ x: 0,
          y: 10 })
        expect(data[1]).toEqual({ x: 1,
          y: 12 })
        expect(data[4]).toEqual({ x: 4,
          y: 18 })
      },
    )

    it(
      'should generate daily time series fixed data with Temporal dates',
      () => {
        const data = generateDailyTimeSeries(
          3,
          '2023-01-01',
          100,
          0,
        )

        expect(data).toHaveLength(3)

        const d0 = asPlainDate(data[0]?.date)
        const d1 = asPlainDate(data[1]?.date)
        const d2 = asPlainDate(data[2]?.date)

        expect(d0.toString()).toBe('2023-01-01')
        expect(d1.toString()).toBe('2023-01-02')
        expect(d2.toString()).toBe('2023-01-03')
      },
    )
  },
)

describe(
  'Obsidian File Builder',
  () => {
    it(
      'should build a simple file',
      () => {
        const file = ObsidianFileBuilder.create('My Note')
          .withContent('Hello World')
          .build()

        expect(file.name).toBe('My Note')
        expect(file.filename).toBe('My Note.md')
        expect(file.content).toBe('Hello World')
        expect(file.path).toEqual([])
      },
    )

    it(
      'should add path segments',
      () => {
        const file = ObsidianFileBuilder.create('Note')
          .withPath(['A',
            'B'])
          .build()
        expect(file.path).toEqual(['A',
          'B'])
      },
    )

    it(
      'should handle frontmatter properties with Temporal types',
      () => {
        const date = Temporal.PlainDate.from('2023-01-01')
        const file = ObsidianFileBuilder.create('Note')
          .withProperty(
            'tags',
            ['a',
              'b'],
          )
          .withProperty(
            'published',
            true,
          )
          .withProperty(
            'created',
            date,
          )
          .build()

        expect(file.frontmatter).toEqual({
          tags: ['a',
            'b'],
          published: true,
          created: date,
        })

        // Verify it's actually a Temporal object
        const created = file.frontmatter.created
        expect(created).toBeInstanceOf(Temporal.PlainDate)
        // Real runtime narrowing (instanceof) instead of an unverified cast.
        if (!(created instanceof Temporal.PlainDate)) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
          throw new Error(`expected a PlainDate, got ${String(created)}`)
        }
        expect(created.year).toBe(2023)
      },
    )

    it(
      'should generate valid raw string with ISO dates',
      () => {
        const date = Temporal.PlainDate.from('2023-01-01')
        const file = ObsidianFileBuilder.create('Note')
          .withProperty(
            'created',
            date,
          )
          .withContent('# Header')
          .toRawString()

        expect(file).toContain('created: 2023-01-01')
        expect(file).toContain('# Header')
        expect(file).toMatch(/^---\n/)
      },
    )
  },
)
