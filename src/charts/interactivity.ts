import * as R from 'remeda'
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
 * Extracts multiple source note file paths from an aggregate or single ECharts interaction event payload.
 *
 * Checks `params.data` first for `filePaths` (array of strings) or `rowIndices` (array of numbers),
 * mapping indices to source note paths in the underlying Bases data array.
 * Falls back to `params.data.filePath` or `extractTargetFilePath` as a single-element list.
 * Preserves insertion order and filters out duplicate paths and empty strings.
 */
export function extractTargetFilePaths(
  params: unknown,
  data?: BasesData | readonly unknown[],
): readonly string[] {
  return !isRecord(params)
    ? []
    : (() => {
        const itemData = params.data
        const fromFilePaths: readonly string[] = isRecord(itemData) && Array.isArray(itemData.filePaths)
          ? R.pipe(
              itemData.filePaths,
              R.filter((p): p is string => typeof p === 'string' && p.length > 0),
              R.unique(),
            )
          : []

        const fromRowIndices: readonly string[] = isRecord(itemData) && Array.isArray(itemData.rowIndices) && data
          ? R.pipe(
              itemData.rowIndices,
              R.filter((idx): idx is number => typeof idx === 'number' && Number.isInteger(idx) && idx >= 0 && idx < data.length),
              R.map(idx => extractFilePath(data[idx])),
              R.filter((p): p is string => typeof p === 'string' && p.length > 0),
              R.unique(),
            )
          : []

        const singlePath = extractTargetFilePath(params, data)
        const fallbackPaths: readonly string[] = singlePath !== undefined && singlePath.length > 0
          ? [singlePath]
          : []

        return fromFilePaths.length > 0
          ? fromFilePaths
          : fromRowIndices.length > 0
            ? fromRowIndices
            : fallbackPaths
      })()
}

/**
 * Formats a display label for a file path, showing its file name if available.
 */
export function formatDisambiguationLabel(filePath: string): string {
  const parts = filePath.split('/')
  const fileName = parts.at(-1)
  return fileName !== undefined && fileName.length > 0 ? fileName : filePath
}

export interface DisambiguationChoice {
  readonly title: string
  readonly filePath: string
}

/**
 * Builds unique disambiguation choices from candidate file paths.
 * If file names collide, uses full paths to disambiguate.
 */
export function buildDisambiguationChoices(
  filePaths: readonly string[],
): readonly DisambiguationChoice[] {
  const uniquePaths: readonly string[] = R.pipe(
    filePaths,
    R.filter((p): p is string => typeof p === 'string' && p.length > 0),
    R.unique(),
  )

  const fileNames: readonly string[] = R.map(uniquePaths, formatDisambiguationLabel)
  const hasDuplicates = fileNames.length !== R.unique(fileNames).length

  return R.map(uniquePaths, filePath => ({
    title: hasDuplicates ? filePath : formatDisambiguationLabel(filePath),
    filePath,
  }))
}

export interface DisambiguationMenuItemLike {
  readonly setTitle: (title: string) => unknown
  readonly setIcon?: (icon: string) => unknown
  readonly onClick: (cb: (evt?: unknown) => unknown) => unknown
}

export interface DisambiguationMenuLike {
  readonly addItem: (cb: (item: DisambiguationMenuItemLike) => unknown) => unknown
}

/**
 * Populates an Obsidian menu or menu-like container with disambiguation choices.
 */
export function populateDisambiguationMenu<T extends DisambiguationMenuLike>(
  menu: T,
  filePaths: readonly string[],
  onSelect: (filePath: string) => unknown,
): T {
  return R.pipe(
    buildDisambiguationChoices(filePaths),
    R.reduce((currentMenu, choice) => {
      void currentMenu.addItem((item) => {
        void item.setTitle(choice.title)
        void item.setIcon?.('file-text')
        void item.onClick(_evt => onSelect(choice.filePath))
        return item
      })
      return currentMenu
    }, menu),
  )
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

export interface FileLookupApp<TFile = unknown> {
  readonly vault: {
    readonly getAbstractFileByPath: (path: string) => TFile | null
  }
  readonly metadataCache: {
    readonly getFirstLinkpathDest: (linkpath: string, sourcePath: string) => TFile | null
  }
}

/**
 * Resolves a note file reference using vault path lookup with metadata cache linkpath fallback.
 */
export function resolveSourceNoteFile<TFile = unknown>(
  app: FileLookupApp<TFile>,
  filePath: string,
): TFile | null {
  return app.vault.getAbstractFileByPath(filePath)
    ?? app.metadataCache.getFirstLinkpathDest(filePath, '')
}
