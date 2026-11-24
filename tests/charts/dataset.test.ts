import { describe, it, expect } from 'bun:test'
import type { BasesPropertyId } from 'obsidian'
import {
  unwrapBasesValue,
  serializeBasesDataset,
  injectBasesDataset,
  type BasesDataset,
  type BasesDatasetEntryLike,
} from '../../src/charts/dataset'

function makeNullValue() {
  class NullValue {
    static type = 'null'
    isTruthy(): boolean {
      return false
    }

    toString(): string {
      return 'null'
    }
  }
  return new NullValue()
}

function makeErrorValue(message = 'Formula error') {
  class ErrorValue {
    static type = 'error'
    readonly error = message
    isTruthy(): boolean {
      return false
    }

    toString(): string {
      return `#ERROR: ${this.error}`
    }
  }
  return new ErrorValue()
}

function makeBooleanValue(value: boolean) {
  class BooleanValue {
    static type = 'boolean'
    readonly data = value
    isTruthy(): boolean {
      return this.data
    }

    toString(): string {
      return String(this.data)
    }
  }
  return new BooleanValue()
}

function makeNumberValue(text: string, data = Number(text)) {
  class NumberValue {
    static type = 'number'
    readonly data = data
    isTruthy(): boolean {
      return Boolean(this.data)
    }

    toString(): string {
      return text
    }
  }
  return new NumberValue()
}

function makeDateValue(text: string, isRelative = false) {
  if (isRelative) {
    class RelativeDateValue {
      static type = 'date'
      readonly date = text
      dateOnly() {
        return this
      }

      toString(): string {
        return text
      }
    }
    return new RelativeDateValue()
  }
  class DateValue {
    static type = 'date'
    readonly date = text
    dateOnly() {
      return this
    }

    toString(): string {
      return text
    }
  }
  return new DateValue()
}

function makeListValue(items: readonly unknown[]) {
  class ListValue {
    static type = 'list'
    length(): number {
      return items.length
    }

    get(index: number): unknown {
      return items[index] ?? makeNullValue()
    }

    toString(): string {
      return items.map(String).join(', ')
    }
  }
  return new ListValue()
}

function makeStringValue(text: string) {
  class StringValue {
    static type = 'string'
    readonly data = text
    toString(): string {
      return text
    }
  }
  return new StringValue()
}

describe('Shared Bases dataset layer', () => {
  describe('unwrapBasesValue', () => {
    it('maps null, undefined, NullValue, and ErrorValue to null', () => {
      expect(unwrapBasesValue(null)).toBeNull()
      expect(unwrapBasesValue(undefined)).toBeNull()
      expect(unwrapBasesValue(makeNullValue())).toBeNull()
      expect(unwrapBasesValue({ renderTo: () => undefined, toString: () => 'null' })).toBeNull()
      expect(unwrapBasesValue(makeErrorValue())).toBeNull()
      expect(unwrapBasesValue({ error: 'bad formula', toString: () => '#ERR' })).toBeNull()
    })

    it('unwraps BooleanValue via isTruthy()', () => {
      expect(unwrapBasesValue(makeBooleanValue(true))).toBe(true)
      expect(unwrapBasesValue(makeBooleanValue(false))).toBe(false)
    })

    it('unwraps finite NumberValue strings and maps empty/non-finite to null', () => {
      expect(unwrapBasesValue(makeNumberValue('42'))).toBe(42)
      expect(unwrapBasesValue(makeNumberValue('3.14'))).toBe(3.14)
      expect(unwrapBasesValue(makeNumberValue('0'))).toBe(0)
      expect(unwrapBasesValue(makeNumberValue(''))).toBeNull()
      expect(unwrapBasesValue(makeNumberValue('   '))).toBeNull()
      expect(unwrapBasesValue(makeNumberValue('NaN', Number.NaN))).toBeNull()
      expect(unwrapBasesValue(makeNumberValue('Infinity', Number.POSITIVE_INFINITY))).toBeNull()
    })

    it('unwraps DateValue and RelativeDateValue to epoch milliseconds via Temporal', () => {
      expect(unwrapBasesValue(makeDateValue('2025-03-15'))).toBe(
        Temporal.PlainDate.from('2025-03-15').toZonedDateTime('UTC').epochMilliseconds,
      )
      expect(unwrapBasesValue(makeDateValue('2025-03-15T10:30:00'))).toBe(
        Temporal.PlainDateTime.from('2025-03-15T10:30:00').toZonedDateTime('UTC').epochMilliseconds,
      )
      expect(unwrapBasesValue(makeDateValue('2025-03-15T10:30:00Z', true))).toBe(
        Temporal.Instant.from('2025-03-15T10:30:00Z').epochMilliseconds,
      )
      expect(unwrapBasesValue(makeDateValue('invalid-date'))).toBeNull()
    })

    it('recursively unwraps ListValue elements', () => {
      const nested = makeListValue([
        makeStringValue('alpha'),
        makeNumberValue('10'),
        makeListValue([makeBooleanValue(true), makeNullValue()]),
      ])
      expect(unwrapBasesValue(nested)).toEqual(['alpha', 10, [true, null]])
    })

    it('unwraps StringValue, LinkValue, and TagValue via toString()', () => {
      expect(unwrapBasesValue(makeStringValue('hello'))).toBe('hello')
      expect(unwrapBasesValue(makeStringValue('null'))).toBe('null')
      expect(unwrapBasesValue({ renderTo: () => undefined, toString: () => '[[Note]]' })).toBe(
        '[[Note]]',
      )
      expect(unwrapBasesValue({ renderTo: () => undefined, toString: () => '#tag' })).toBe('#tag')
    })
  })

  describe('serializeBasesDataset', () => {
    it('excludes _file from dimensions and emits [] for empty properties', () => {
      const entries: readonly BasesDatasetEntryLike[] = [
        {
          file: { path: 'notes/one.md' },
          getValue: () => null,
        },
      ]

      const dataset = serializeBasesDataset(entries, [])
      expect(dataset.id).toBe('bases')
      expect(dataset.dimensions).toEqual([])
      expect(dataset.source).toEqual([{ _file: 'notes/one.md' }])
    })

    it('serializes entries with _file and unwrapped property values', () => {
      const properties: readonly BasesPropertyId[] = [
        'note.category',
        'note.amount',
        'note.active',
        'file.ctime',
      ]
      const valuesByPath: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
        'notes/a.md': {
          'note.category': makeStringValue('Sales'),
          'note.amount': makeNumberValue('250'),
          'note.active': makeBooleanValue(true),
          'file.ctime': makeDateValue('2025-01-10'),
        },
        'notes/b.md': {
          'note.category': makeNullValue(),
          'note.amount': makeErrorValue(),
          'note.active': makeBooleanValue(false),
          'file.ctime': makeNullValue(),
        },
      }

      const entries: readonly BasesDatasetEntryLike[] = Object.keys(valuesByPath).map(path => ({
        file: { path },
        getValue: (propId: BasesPropertyId) => valuesByPath[path]?.[propId] ?? null,
      }))

      const dataset = serializeBasesDataset(entries, properties)
      expect(dataset).toEqual({
        id: 'bases',
        dimensions: ['note.category', 'note.amount', 'note.active', 'file.ctime'],
        source: [
          {
            '_file': 'notes/a.md',
            'note.category': 'Sales',
            'note.amount': 250,
            'note.active': true,
            'file.ctime':
              Temporal.PlainDate.from('2025-01-10').toZonedDateTime('UTC').epochMilliseconds,
          },
          {
            '_file': 'notes/b.md',
            'note.category': null,
            'note.amount': null,
            'note.active': false,
            'file.ctime': null,
          },
        ],
      })
    })
  })

  describe('injectBasesDataset', () => {
    const sampleDataset: BasesDataset = {
      id: 'bases',
      dimensions: ['note.label', 'note.value'],
      source: [{ '_file': 'notes/a.md', 'note.label': 'A', 'note.value': 10 }],
    }

    it('injects into a single-object dataset without mutating userOption', () => {
      const userDataset = { id: 'bases' }
      const userOption = {
        dataset: userDataset,
        series: [{ type: 'bar', encode: { x: 'note.label', y: 'note.value' } }],
      }

      const result = injectBasesDataset(userOption, sampleDataset)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect<unknown>(result.option.dataset).toEqual({
          id: 'bases',
          dimensions: ['note.label', 'note.value'],
          source: sampleDataset.source,
        })
        expect(userOption.dataset).toBe(userDataset)
        expect('source' in userDataset).toBe(false)
      }
    })

    it('injects at the declared index in a dataset array and preserves user dimensions', () => {
      const userOption = {
        dataset: [
          { id: 'static', source: [['X', 1]] },
          { id: 'bases', dimensions: ['custom.a', 'custom.b'] },
          { id: 'filtered', fromDatasetId: 'bases', transform: { type: 'filter' } },
        ],
      }

      const result = injectBasesDataset(userOption, sampleDataset)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect<unknown>(result.option.dataset).toEqual([
          { id: 'static', source: [['X', 1]] },
          {
            id: 'bases',
            dimensions: ['custom.a', 'custom.b'],
            source: sampleDataset.source,
          },
          { id: 'filtered', fromDatasetId: 'bases', transform: { type: 'filter' } },
        ])
      }
    })

    it('returns error when dataset is missing or invalid', () => {
      expect(injectBasesDataset({}, sampleDataset).ok).toBe(false)
      expect(injectBasesDataset({ dataset: null }, sampleDataset).ok).toBe(false)
      expect(injectBasesDataset({ dataset: 'bases' }, sampleDataset).ok).toBe(false)
      expect(injectBasesDataset({ dataset: [null] }, sampleDataset).ok).toBe(false)
      expect(injectBasesDataset({ dataset: [['bad']] }, sampleDataset).ok).toBe(false)
    })

    it('returns error when id: bases is missing or duplicated', () => {
      expect(injectBasesDataset({ dataset: { id: 'other' } }, sampleDataset).ok).toBe(false)
      expect(
        injectBasesDataset(
          {
            dataset: [{ id: 'bases' }, { id: 'bases' }],
          },
          sampleDataset,
        ).ok,
      ).toBe(false)
    })

    it('returns error when id: bases defines conflicting dataset properties', () => {
      const forbiddenKeys = [
        'source',
        'transform',
        'fromDatasetIndex',
        'fromDatasetId',
        'fromTransformResult',
        'seriesLayoutBy',
        'sourceHeader',
      ] as const

      for (const key of forbiddenKeys) {
        const result = injectBasesDataset(
          {
            dataset: { id: 'bases', [key]: 'conflict' },
          },
          sampleDataset,
        )
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toContain(key)
        }
      }
    })

    it('accepts forbidden dataset keys when explicitly set to undefined', () => {
      const result = injectBasesDataset(
        {
          dataset: { id: 'bases', source: undefined, transform: undefined },
        },
        sampleDataset,
      )
      expect(result.ok).toBe(true)
    })
  })
})
