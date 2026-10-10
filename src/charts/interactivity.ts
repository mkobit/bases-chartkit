import type { BasesData } from './transformers/base'
import { extractFilePath, isRecord } from './transformers/bases-values'

export interface RawMouseEventData {
  readonly button?: number
  readonly ctrlKey?: boolean
  readonly metaKey?: boolean
  readonly altKey?: boolean
  readonly shiftKey?: boolean
  readonly target?: unknown
}

/**
 * Extracts the source note file path from an ECharts interaction event payload.
 *
 * Checks `params.data` first for directly attached `filePath` or nested file
 * properties, falling back to resolving via `rowIndex` or `dataIndex` in the
 * underlying Bases data array.
 */
export function extractTargetFilePath(
  params: unknown,
  data?: BasesData | readonly unknown[],
): string | undefined {
  return !isRecord(params)
    ? undefined
    : (() => {
        const itemData = params.data
        const fromItem = isRecord(itemData)
          ? (extractFilePath(itemData) ?? (
              typeof itemData.rowIndex === 'number' && data && itemData.rowIndex >= 0 && itemData.rowIndex < data.length
                ? extractFilePath(data[itemData.rowIndex])
                : undefined
            ))
          : undefined

        return fromItem !== undefined
          ? fromItem
          : (
              typeof params.dataIndex === 'number' && data && params.dataIndex >= 0 && params.dataIndex < data.length
                ? extractFilePath(data[params.dataIndex])
                : undefined
            )
      })()
}

/**
 * Extracts the underlying raw mouse event from an ECharts zrender event wrapper.
 */
export function extractRawMouseEvent(params: unknown): RawMouseEventData | undefined {
  return !isRecord(params)
    ? undefined
    : !isRecord(params.event)
        ? undefined
        : isRecord(params.event.event)
          ? params.event.event
          : params.event
}

/**
 * Evaluates whether an interaction event represents a modifier/middle click for note navigation.
 */
export function resolveModClickLeaf<T>(
  evt: RawMouseEventData | undefined,
  isModEvent: (evt?: RawMouseEventData | null) => T | boolean,
): T | boolean | null {
  return !evt ? null : (isModEvent(evt) || null)
}
