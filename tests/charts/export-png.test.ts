import { describe, it, expect, mock } from 'bun:test'
import {
  copyChartAsPng,
  dataUrlToPngBlob,
  resolveExportBackgroundColor,
  type ChartImageSource,
  type ClipboardItemFactory,
  type ClipboardWriter,
} from '../../src/charts/export-png'

const SAMPLE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
const SAMPLE_PNG_DATA_URL = `data:image/png;base64,${SAMPLE_PNG_BASE64}`

const stubClipboardItemFactory: ClipboardItemFactory = (items) => {
  const types = Object.keys(items)
  return {
    types,
    presentationStyle: 'unspecified',
    getType: (type: string) => Promise.resolve(items[type] ?? new Blob()),
  }
}

describe('dataUrlToPngBlob', () => {
  it('converts a valid PNG data URL to an image/png Blob', async () => {
    const blob = dataUrlToPngBlob(SAMPLE_PNG_DATA_URL)
    expect(blob).not.toBeNull()
    expect(blob?.type).toBe('image/png')
    const buffer = blob ? await blob.arrayBuffer() : undefined
    const bytes = buffer ? new Uint8Array(buffer) : new Uint8Array()
    expect(bytes.length).toBeGreaterThan(0)
    // PNG magic bytes: 89 50 4E 47
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4E, 0x47])
  })

  it('returns null for non-PNG data URLs', () => {
    expect(dataUrlToPngBlob('data:image/jpeg;base64,/9j/4AAQ')).toBeNull()
  })

  it('returns null for malformed data URLs', () => {
    expect(dataUrlToPngBlob('not-a-data-url')).toBeNull()
    expect(dataUrlToPngBlob('data:image/png;base64,')).toBeNull()
    expect(dataUrlToPngBlob('data:image/png;base64,!!!invalid!!!')).toBeNull()
  })
})

describe('resolveExportBackgroundColor', () => {
  it('returns undefined when a named or auto theme is active', () => {
    expect(resolveExportBackgroundColor('obsidian-auto', false)).toBeUndefined()
    expect(resolveExportBackgroundColor('dark', true)).toBeUndefined()
    expect(resolveExportBackgroundColor('my-custom-theme', false)).toBeUndefined()
  })

  it('returns a fallback background color when theme is undefined', () => {
    expect(resolveExportBackgroundColor(undefined, false)).toBe('#ffffff')
    expect(resolveExportBackgroundColor(undefined, true)).toBe('#1e1e1e')
  })
})

describe('copyChartAsPng', () => {
  it('exports the chart as PNG and writes a ClipboardItem to the clipboard', async () => {
    const getDataURL = mock(() => SAMPLE_PNG_DATA_URL)
    const chart: ChartImageSource = { getDataURL }
    const write = mock(() => Promise.resolve())
    const clipboard: ClipboardWriter = { write }
    const createClipboardItem = mock(stubClipboardItemFactory)

    const ok = await copyChartAsPng(chart, {
      backgroundColor: '#ffffff',
      clipboard,
      createClipboardItem,
    })

    expect(ok).toBe(true)
    expect(getDataURL).toHaveBeenCalledWith({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    })
    expect(createClipboardItem).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('returns false when clipboard write rejects', async () => {
    const chart: ChartImageSource = {
      getDataURL: () => SAMPLE_PNG_DATA_URL,
    }
    const clipboard: ClipboardWriter = {
      write: () => Promise.reject(new Error('Clipboard denied')),
    }

    const ok = await copyChartAsPng(chart, {
      clipboard,
      createClipboardItem: stubClipboardItemFactory,
    })
    expect(ok).toBe(false)
  })

  it('returns false when chart returns an invalid data URL', async () => {
    const chart: ChartImageSource = {
      getDataURL: () => 'invalid',
    }
    const write = mock(() => Promise.resolve())
    const clipboard: ClipboardWriter = { write }

    const ok = await copyChartAsPng(chart, {
      clipboard,
      createClipboardItem: stubClipboardItemFactory,
    })
    expect(ok).toBe(false)
    expect(write).not.toHaveBeenCalled()
  })
})
