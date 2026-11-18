import type { EChartsOption } from 'echarts'
import type { BasesPropertyId } from 'obsidian'
import * as R from 'remeda'
import { isRecord } from './transformers/bases-values'
import { parseDateToEpochMs } from './transformers/dates'

export type BasesDatasetEntryLike = {
  readonly file: {
    readonly path: string
  }
} & {
  readonly getValue: (propertyId: BasesPropertyId) => unknown
}

export type BasesDatasetValue
  = | string
    | number
    | boolean
    | null
    | readonly BasesDatasetValue[]

export type BasesDatasetRow = {
  readonly _file: string
} & Readonly<Record<string, BasesDatasetValue>>

export interface BasesDataset {
  readonly id: 'bases'
  readonly dimensions: readonly string[]
  readonly source: readonly BasesDatasetRow[]
}

export type InjectBasesDatasetResult
  = | { readonly ok: true, readonly option: EChartsOption }
    | { readonly ok: false, readonly error: string }

const FORBIDDEN_BASES_DATASET_KEYS = [
  'source',
  'transform',
  'fromDatasetIndex',
  'fromDatasetId',
  'fromTransformResult',
  'seriesLayoutBy',
  'sourceHeader',
] as const

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && !Array.isArray(value)
}

function getValueStaticType(val: Record<string, unknown>): string | undefined {
  const ctor: unknown = val.constructor
  return (typeof ctor === 'function' || isRecord(ctor)) && 'type' in ctor && typeof ctor.type === 'string'
    ? ctor.type
    : undefined
}

function isErrorValueLike(val: Record<string, unknown>): boolean {
  return val.constructor.name === 'ErrorValue'
    || getValueStaticType(val) === 'error'
    || ('error' in val && val.error !== undefined)
}

function isNullValueLike(val: Record<string, unknown>): boolean {
  const staticType = getValueStaticType(val)
  return val.constructor.name === 'NullValue' || staticType === 'null'
    ? true
    : typeof val.toString === 'function'
      && val.toString() === 'null'
      && !('data' in val)
      && !('date' in val)
      && typeof val.length !== 'function'
      && staticType !== 'string'
      && val.constructor.name !== 'StringValue'
}

interface ListValueLike {
  readonly length: () => number
  readonly get: (index: number) => unknown
}

function isListValueLike(val: Record<string, unknown>): val is Record<string, unknown> & ListValueLike {
  return typeof val.length === 'function' && typeof val.get === 'function'
}

function isBooleanValueLike(val: Record<string, unknown>): boolean {
  return val.constructor.name === 'BooleanValue'
    || getValueStaticType(val) === 'boolean'
    || typeof val.data === 'boolean'
}

function isNumberValueLike(val: Record<string, unknown>): boolean {
  return val.constructor.name === 'NumberValue'
    || getValueStaticType(val) === 'number'
    || typeof val.data === 'number'
}

function isDateValueLike(val: Record<string, unknown>): boolean {
  return val.constructor.name === 'DateValue'
    || val.constructor.name === 'RelativeDateValue'
    || getValueStaticType(val) === 'date'
    || typeof val.dateOnly === 'function'
    || 'date' in val
}

function unwrapNumberString(str: string): number | null {
  return str.trim().length === 0
    ? null
    : (() => {
        const num = Number(str)
        return Number.isFinite(num) ? num : null
      })()
}

/**
 * Unwraps an Obsidian Bases `Value` wrapper into a native JS value suitable for an ECharts dataset.
 */
export function unwrapBasesValue(val: unknown): BasesDatasetValue {
  return val === null || val === undefined
    ? null
    : !isRecord(val)
        ? (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' ? val : null)
        : isErrorValueLike(val) || isNullValueLike(val)
          ? null
          : isListValueLike(val)
            ? R.range(0, val.length()).map(index => unwrapBasesValue(val.get(index)))
            : isBooleanValueLike(val)
              ? (typeof val.isTruthy === 'function' ? val.isTruthy() : Boolean(val.data))
              : isNumberValueLike(val)
                ? unwrapNumberString(val.toString())
                : isDateValueLike(val)
                  ? parseDateToEpochMs(val.toString())
                  : val.toString()
}

/**
 * Serializes Obsidian `BasesEntry[]` and `BasesPropertyId[]` into an ECharts `dataset` (`id: 'bases'`).
 */
export function serializeBasesDataset(
  entries: readonly BasesDatasetEntryLike[],
  properties: readonly BasesPropertyId[],
): BasesDataset {
  const dimensions: readonly string[] = [...properties]
  const source: readonly BasesDatasetRow[] = entries.map((entry) => {
    const propEntries: readonly (readonly [string, BasesDatasetValue])[] = properties.map(
      propId => [propId, unwrapBasesValue(entry.getValue(propId))] as const,
    )
    return {
      ...Object.fromEntries(propEntries),
      _file: entry.file.path,
    }
  })

  return {
    id: 'bases',
    dimensions,
    source,
  }
}

function isPlainObjectArray(value: unknown): value is readonly Record<string, unknown>[] {
  return Array.isArray(value) && value.every(isPlainObject)
}

function buildInjectedDatasetEntry(
  userEntry: Record<string, unknown>,
  basesDataset: BasesDataset,
): Record<string, unknown> {
  const dimensions = userEntry.dimensions ?? basesDataset.dimensions
  return {
    ...userEntry,
    id: 'bases',
    source: basesDataset.source,
    dimensions,
  }
}

function validateAndInjectEntries(
  userOption: Record<string, unknown>,
  entries: readonly Record<string, unknown>[],
  isArrayDataset: boolean,
  basesDataset: BasesDataset,
): InjectBasesDatasetResult {
  const matchingEntries = entries.filter((entry): boolean => entry.id === 'bases')
  const basesEntry = matchingEntries[0]
  const conflictingKey = basesEntry
    ? FORBIDDEN_BASES_DATASET_KEYS.find(
        (key): boolean => key in basesEntry && basesEntry[key] !== undefined,
      )
    : undefined

  return matchingEntries.length === 0 || !basesEntry
    ? { ok: false, error: 'Option "dataset" must include an entry with id: "bases".' }
    : matchingEntries.length > 1
      ? { ok: false, error: 'Option "dataset" must contain only one entry with id: "bases".' }
      : conflictingKey !== undefined
        ? { ok: false, error: `Dataset with id: "bases" must not define "${conflictingKey}".` }
        : {
            ok: true,
            option: {
              ...userOption,
              dataset: isArrayDataset
                ? entries.map(entry => (entry.id === 'bases' ? buildInjectedDatasetEntry(entry, basesDataset) : entry))
                : buildInjectedDatasetEntry(basesEntry, basesDataset),
            },
          }
}

/**
 * Validates `userOption.dataset` for a single `id: 'bases'` entry and injects `basesDataset`
 * at its declared index without mutating `userOption`.
 */
export function injectBasesDataset(
  userOption: Record<string, unknown>,
  basesDataset: BasesDataset,
): InjectBasesDatasetResult {
  const rawDataset = userOption.dataset
  return rawDataset === undefined || rawDataset === null
    ? { ok: false, error: 'Option must define a "dataset" with id: "bases".' }
    : Array.isArray(rawDataset)
      ? isPlainObjectArray(rawDataset)
        ? validateAndInjectEntries(userOption, rawDataset, true, basesDataset)
        : { ok: false, error: 'Every entry in "dataset" must be an object.' }
      : isPlainObject(rawDataset)
        ? validateAndInjectEntries(userOption, [rawDataset], false, basesDataset)
        : { ok: false, error: '"dataset" must be an object or an array of objects.' }
}
