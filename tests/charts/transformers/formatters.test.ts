import { describe, expect, test } from 'bun:test'
import { formatValue, formatDurationMs, formatDateValue, formatNumericValue } from '../../../src/charts/transformers/formatters'

describe('formatters', () => {
  describe('formatDurationMs', () => {
    test('formats milliseconds into human readable durations', () => {
      expect(formatDurationMs(432_000_000)).toBe('5d')
      expect(formatDurationMs(450_000_000)).toBe('5d 5h')
      expect(formatDurationMs(7_200_000)).toBe('2h')
      expect(formatDurationMs(7_380_000)).toBe('2h 3m')
      expect(formatDurationMs(90_000)).toBe('1m 30s')
      expect(formatDurationMs(45_000)).toBe('45s')
      expect(formatDurationMs(500)).toBe('500ms')
    })

    test('handles invalid or non-finite numbers', () => {
      expect(formatDurationMs(NaN)).toBe('')
    })
  })

  describe('formatDateValue', () => {
    test('formats dates with pattern strings', () => {
      const dateStr = '2024-03-15T00:00:00Z'
      expect(formatDateValue(dateStr, 'YYYY-MM-DD')).toBe('2024-03-15')
      expect(formatDateValue(dateStr, 'MMM DD, YYYY')).toBe('Mar 15, 2024')
      expect(formatDateValue(dateStr, 'quarter')).toBe('Q1')
      expect(formatDateValue(dateStr, 'YYYY-[Q]Q')).toBe('2024-Q1')
    })
  })

  describe('formatNumericValue', () => {
    test('formats currency and compact numbers', () => {
      expect(formatNumericValue(1234.56, 'currency:USD')).toBe('$1,234.56')
      expect(formatNumericValue(0.85, 'percent')).toBe('85.0%')
      expect(formatNumericValue(1_500_000, 'compact')).toBe('1.5M')
      expect(formatNumericValue(42, '{value} ms')).toBe('42 ms')
    })
  })

  describe('formatValue', () => {
    test('handles duration specifiers', () => {
      expect(formatValue(432_000_000, 'duration')).toBe('5d')
      expect(formatValue(45, 'duration:s')).toBe('45s')
    })

    test('handles empty or undefined format pattern', () => {
      expect(formatValue('hello')).toBe('hello')
      expect(formatValue(123)).toBe('123')
    })
  })
})
