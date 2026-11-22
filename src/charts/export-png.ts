export interface ChartImageSource {
  readonly getDataURL: (opts?: {
    readonly type?: 'png'
    readonly pixelRatio?: number
    readonly backgroundColor?: string
  }) => string
}

export interface ClipboardWriter {
  readonly write: (items: ClipboardItem[]) => Promise<void>
}

export type ClipboardItemFactory = (items: Record<string, Blob>) => ClipboardItem

export interface CopyChartAsPngOptions {
  readonly backgroundColor?: string
  readonly pixelRatio?: number
  readonly clipboard?: ClipboardWriter
  readonly createClipboardItem?: ClipboardItemFactory
}

const PNG_DATA_URL_PREFIX = 'data:image/png;base64'
const DEFAULT_EXPORT_PIXEL_RATIO = 2

export function dataUrlToPngBlob(dataUrl: string): Blob | null {
  const commaIndex = dataUrl.indexOf(',')
  const header = commaIndex === -1 ? '' : dataUrl.slice(0, commaIndex)
  const base64 = commaIndex === -1 ? '' : dataUrl.slice(commaIndex + 1)

  return commaIndex === -1 || !header.startsWith(PNG_DATA_URL_PREFIX) || base64.length === 0
    ? null
    : decodeBase64Png(base64)
}

function decodeBase64Png(base64: string): Blob | null {
  try {
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    return new Blob([bytes], { type: 'image/png' })
  }
  catch {
    return null
  }
}

export function resolveExportBackgroundColor(
  theme: string | undefined,
  isDarkMode: boolean,
): string | undefined {
  return theme !== undefined
    ? undefined
    : isDarkMode
      ? '#1e1e1e'
      : '#ffffff'
}

function defaultCreateClipboardItem(items: Record<string, Blob>): ClipboardItem {
  return new ClipboardItem(items)
}

export async function copyChartAsPng(
  chart: ChartImageSource,
  options?: CopyChartAsPngOptions,
): Promise<boolean> {
  const clipboard = options?.clipboard ?? (typeof navigator !== 'undefined' ? navigator.clipboard : undefined)
  const canCreateItem = options?.createClipboardItem !== undefined || typeof ClipboardItem !== 'undefined'

  return !clipboard || typeof clipboard.write !== 'function' || !canCreateItem
    ? false
    : writeChartPngToClipboard(
        chart,
        clipboard,
        options?.createClipboardItem ?? defaultCreateClipboardItem,
        options,
      )
}

async function writeChartPngToClipboard(
  chart: ChartImageSource,
  clipboard: ClipboardWriter,
  createClipboardItem: ClipboardItemFactory,
  options?: CopyChartAsPngOptions,
): Promise<boolean> {
  try {
    const dataUrl = chart.getDataURL({
      type: 'png',
      pixelRatio: options?.pixelRatio ?? DEFAULT_EXPORT_PIXEL_RATIO,
      ...(options?.backgroundColor ? { backgroundColor: options.backgroundColor } : {}),
    })
    const blob = dataUrlToPngBlob(dataUrl)
    return blob
      ? await writeBlob(clipboard, createClipboardItem, blob)
      : false
  }
  catch {
    return false
  }
}

async function writeBlob(
  clipboard: ClipboardWriter,
  createClipboardItem: ClipboardItemFactory,
  blob: Blob,
): Promise<boolean> {
  await clipboard.write([createClipboardItem({ 'image/png': blob })])
  return true
}
