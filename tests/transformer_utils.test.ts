import { describe, it, expect } from 'bun:test'
import {
  safeToString,
  isRecord,
  getNestedValue,
  getLegendOption,
} from '../src/charts/transformers/utils'
import type { BaseTransformerOptions } from '../src/charts/transformers/base'

describe('Transformer Utils', () => {
  describe('safeToString', () => {
    it('should handle strings natively', () => {
      expect(safeToString('hello')).toBe('hello')
      expect(safeToString('')).toBe('')
    })

    it('should handle numbers and booleans', () => {
      expect(safeToString(42)).toBe('42')
      expect(safeToString(0)).toBe('0')
      expect(safeToString(true)).toBe('true')
      expect(safeToString(false)).toBe('false')
    })

    it('should handle null and undefined', () => {
      expect(safeToString(null)).toBe('')
      expect(safeToString(undefined)).toBe('')
    })

    it('should JSON stringify objects and arrays', () => {
      expect(safeToString({ a: 1 })).toBe('{"a":1}')
      expect(safeToString([1, 2, 3])).toBe('[1,2,3]')
    })
  })

  describe('isRecord', () => {
    it('should return true for objects', () => {
      expect(isRecord({})).toBe(true)
      expect(isRecord({ a: 1 })).toBe(true)
    })

    it('should return true for arrays', () => {
      // typeof [] === 'object'
      expect(isRecord([])).toBe(true)
      expect(isRecord([1, 2, 3])).toBe(true)
    })

    it('should return false for null and undefined', () => {
      expect(isRecord(null)).toBe(false)
      expect(isRecord(undefined)).toBe(false)
    })

    it('should return false for scalar values', () => {
      expect(isRecord(42)).toBe(false)
      expect(isRecord('hello')).toBe(false)
      expect(isRecord(true)).toBe(false)
    })
  })

  describe('getNestedValue', () => {
    const obj = {
      a: {
        b: {
          c: 42,
        },
      },
      x: null,
      y: [1, 2, 3],
    }

    it('should retrieve deeply nested values', () => {
      expect(getNestedValue(obj, 'a')).toEqual({ b: { c: 42 } })
      expect(getNestedValue(obj, 'a.b')).toEqual({ c: 42 })
      expect(getNestedValue(obj, 'a.b.c')).toBe(42)
    })

    it('should return undefined for missing paths', () => {
      expect(getNestedValue(obj, 'z')).toBeUndefined()
      expect(getNestedValue(obj, 'a.z')).toBeUndefined()
      expect(getNestedValue(obj, 'a.b.z')).toBeUndefined()
      expect(getNestedValue(obj, 'a.b.c.d')).toBeUndefined()
    })

    it('should return undefined when encountering non-record intermediate values', () => {
      expect(getNestedValue(obj, 'x.y')).toBeUndefined()
    })

    it('should handle array paths correctly', () => {
      expect(getNestedValue(obj, 'y.0')).toBe(1)
      expect(getNestedValue(obj, 'y.1')).toBe(2)
      expect(getNestedValue(obj, 'y.3')).toBeUndefined()
    })

    it('should return undefined for non-object inputs', () => {
      expect(getNestedValue(null, 'a')).toBeUndefined()
      expect(getNestedValue(undefined, 'a')).toBeUndefined()
      expect(getNestedValue('string', 'a')).toBeUndefined()
      expect(getNestedValue(42, 'a')).toBeUndefined()
    })
  })

  describe('getLegendOption', () => {
    it('should return undefined if legend is false or missing', () => {
      expect(getLegendOption()).toBeUndefined()
      expect(getLegendOption({})).toBeUndefined()
      expect(getLegendOption({ legend: false })).toBeUndefined()
    })

    it('should return a legend option when legend is true', () => {
      const result = getLegendOption({ legend: true })
      expect(result).toBeDefined()
      if (result) {
        expect(result.type).toBe('scroll')
        expect(result.top).toBe(0)
        expect(result.left).toBe('center')
        expect(result.orient).toBe('horizontal')
      }
    })

    describe('compact mode logic', () => {
      it('should default to bottom if isMobile is true', () => {
        const result = getLegendOption({ legend: true, isMobile: true })
        expect(result).toBeDefined()
        if (result) {
          expect(result.bottom).toBe(0)
          expect(result.left).toBe('center')
          expect(result.orient).toBe('horizontal')
        }
      })

      it('should default to bottom if containerWidth < 600', () => {
        const result = getLegendOption({ legend: true, containerWidth: 500 })
        expect(result).toBeDefined()
        if (result) {
          expect(result.bottom).toBe(0)
          expect(result.left).toBe('center')
          expect(result.orient).toBe('horizontal')
        }
      })

      it('should default to top if containerWidth >= 600', () => {
        const result = getLegendOption({ legend: true, containerWidth: 800 })
        expect(result).toBeDefined()
        if (result) {
          expect(result.top).toBe(0)
          expect(result.left).toBe('center')
          expect(result.orient).toBe('horizontal')
        }
      })
    })

    describe('user-specified position and orientation', () => {
      it('should use user-specified position and deduce orientation (left)', () => {
        const result = getLegendOption({ legend: true, legendPosition: 'left' })
        expect(result).toBeDefined()
        if (result) {
          expect(result.left).toBe(0)
          expect(result.top).toBe('middle')
          expect(result.orient).toBe('vertical')
        }
      })

      it('should use user-specified position and deduce orientation (right)', () => {
        const result = getLegendOption({ legend: true, legendPosition: 'right' })
        expect(result).toBeDefined()
        if (result) {
          expect(result.right).toBe(0)
          expect(result.top).toBe('middle')
          expect(result.orient).toBe('vertical')
        }
      })

      it('should use user-specified position and deduce orientation (bottom)', () => {
        const result = getLegendOption({ legend: true, legendPosition: 'bottom' })
        expect(result).toBeDefined()
        if (result) {
          expect(result.bottom).toBe(0)
          expect(result.left).toBe('center')
          expect(result.orient).toBe('horizontal')
        }
      })

      it('should fall back to top for unknown user-specified positions', () => {
        const result = getLegendOption({ legend: true, legendPosition: 'unknown-position' } as unknown as BaseTransformerOptions)
        expect(result).toBeDefined()
        if (result) {
          expect(result.top).toBe(0)
          expect(result.left).toBe('center')
          expect(result.orient).toBe('horizontal')
        }
      })

      it('should override deduced orientation with legendOrient', () => {
        const result = getLegendOption({ legend: true, legendPosition: 'left', legendOrient: 'horizontal' })
        expect(result).toBeDefined()
        if (result) {
          expect(result.left).toBe(0)
          expect(result.top).toBe('middle')
          expect(result.orient).toBe('horizontal')
        }
      })
    })
  })
})
