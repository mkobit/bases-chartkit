import { describe, it, expect } from 'bun:test'
import {
  parseColorBands,
  isAggregation,
  AGGREGATIONS,
} from '../../../src/charts/transformers/gauge'

describe(
  'Gauge transformer helpers',
  () => {
    describe(
      'parseColorBands',
      () => {
        it(
          'should parse comma-separated threshold:color pairs',
          () => {
            const result = parseColorBands('30:#67e0e3,70:#37a2da,100:#fd666d')
            expect(result).toEqual([
              { threshold: 30, color: '#67e0e3' },
              { threshold: 70, color: '#37a2da' },
              { threshold: 100, color: '#fd666d' },
            ])
          },
        )

        it(
          'should trim whitespace around thresholds and colors',
          () => {
            const result = parseColorBands('  30 :  #67e0e3 ,  70 : #37a2da  ')
            expect(result).toEqual([
              { threshold: 30, color: '#67e0e3' },
              { threshold: 70, color: '#37a2da' },
            ])
          },
        )

        it(
          'should return undefined for non-string or empty input',
          () => {
            expect(parseColorBands(undefined)).toBeUndefined()
            expect(parseColorBands(null)).toBeUndefined()
            expect(parseColorBands(123)).toBeUndefined()
            expect(parseColorBands('')).toBeUndefined()
            expect(parseColorBands('   ')).toBeUndefined()
          },
        )

        it(
          'should drop invalid pairs with non-numeric thresholds or missing colors',
          () => {
            const result = parseColorBands('30:#67e0e3,invalid:#37a2da,50:,:blue,100:#fd666d')
            expect(result).toEqual([
              { threshold: 30, color: '#67e0e3' },
              { threshold: 100, color: '#fd666d' },
            ])
          },
        )

        it(
          'should return undefined if all pairs are invalid',
          () => {
            expect(parseColorBands('invalid,also:invalid:extra,nonnumeric:#fff')).toBeUndefined()
          },
        )
      },
    )

    describe(
      'isAggregation',
      () => {
        it(
          'should return true for known aggregation strings',
          () => {
            AGGREGATIONS.forEach((agg) => {
              expect(isAggregation(agg)).toBe(true)
            })
          },
        )

        it(
          'should return false for invalid strings or non-string values',
          () => {
            expect(isAggregation('median')).toBe(false)
            expect(isAggregation('')).toBe(false)
            expect(isAggregation(123)).toBe(false)
            expect(isAggregation(null)).toBe(false)
            expect(isAggregation(undefined)).toBe(false)
          },
        )
      },
    )
  },
)
