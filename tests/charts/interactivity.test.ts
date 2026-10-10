import { describe, it, expect } from 'bun:test'
import {
  extractTargetFilePath,
  extractRawMouseEvent,
  resolveModClickLeaf,
  resolveSourceNoteFile,
} from '../../src/charts/interactivity'
import type { RawMouseEventData } from '../../src/charts/interactivity'

describe('Chart interactivity', () => {
  describe('extractTargetFilePath', () => {
    it('extracts filePath directly from params.data', () => {
      const params = {
        data: {
          x: 'Category A',
          y: 42,
          filePath: 'Notes/Task A.md',
          rowIndex: 0,
        },
      }
      expect(extractTargetFilePath(params)).toBe('Notes/Task A.md')
    })

    it('extracts filePath from nested file object in params.data', () => {
      const params = {
        data: {
          name: 'Leaf Node',
          value: 10,
          file: { path: 'Notes/Leaf.md' },
        },
      }
      expect(extractTargetFilePath(params)).toBe('Notes/Leaf.md')
    })

    it('resolves filePath via rowIndex lookup in data entries', () => {
      const params = {
        data: {
          x: 'Point 1',
          y: 100,
          rowIndex: 2,
        },
      }
      const data = [
        { filePath: 'Notes/0.md' },
        { filePath: 'Notes/1.md' },
        { filePath: 'Notes/2.md' },
      ]
      expect(extractTargetFilePath(params, data)).toBe('Notes/2.md')
    })

    it('resolves filePath via dataIndex fallback when params.data lacks path and rowIndex', () => {
      const params = {
        data: [10, 20],
        dataIndex: 1,
      }
      const data = [
        { filePath: 'Notes/First.md' },
        { filePath: 'Notes/Second.md' },
      ]
      expect(extractTargetFilePath(params, data)).toBe('Notes/Second.md')
    })

    it('returns undefined when aggregate or branch node has no filePath or rowIndex', () => {
      const params = {
        data: {
          name: 'Folder Branch',
          value: 50,
          children: [],
        },
      }
      expect(extractTargetFilePath(params)).toBeUndefined()
    })

    it('returns undefined for non-object params or empty values', () => {
      expect(extractTargetFilePath(null)).toBeUndefined()
      expect(extractTargetFilePath(undefined)).toBeUndefined()
      expect(extractTargetFilePath('string')).toBeUndefined()
      expect(extractTargetFilePath({ data: { filePath: '' } })).toBeUndefined()
    })
  })

  describe('extractRawMouseEvent', () => {
    it('extracts native event from nested ECharts zrender ElementEvent', () => {
      const fakeNativeEvent: RawMouseEventData = { button: 0, ctrlKey: true }
      const params = {
        event: {
          event: fakeNativeEvent,
        },
      }
      expect(extractRawMouseEvent(params)).toBe(fakeNativeEvent)
    })

    it('extracts event from shallow event wrapper', () => {
      const fakeNativeEvent: RawMouseEventData = { button: 1, ctrlKey: false }
      const params = {
        event: fakeNativeEvent,
      }
      expect(extractRawMouseEvent(params)).toBe(fakeNativeEvent)
    })

    it('returns undefined when params or event is absent or invalid', () => {
      expect(extractRawMouseEvent(null)).toBeUndefined()
      expect(extractRawMouseEvent({})).toBeUndefined()
      expect(extractRawMouseEvent({ event: null })).toBeUndefined()
    })
  })

  describe('resolveModClickLeaf', () => {
    it('returns pane type for Mod-click', () => {
      const fakeEvent: RawMouseEventData = { button: 0, metaKey: true }
      const isModEvent = (evt?: RawMouseEventData | null) => (evt && (evt.metaKey || evt.ctrlKey) ? 'tab' : false)
      expect(resolveModClickLeaf(fakeEvent, isModEvent)).toBe('tab')
    })

    it('returns pane type for middle click', () => {
      const fakeEvent: RawMouseEventData = { button: 1, metaKey: false }
      const isModEvent = (evt?: RawMouseEventData | null) => (evt && evt.button === 1 ? 'tab' : false)
      expect(resolveModClickLeaf(fakeEvent, isModEvent)).toBe('tab')
    })

    it('returns null for plain left click', () => {
      const fakeEvent: RawMouseEventData = { button: 0, metaKey: false, ctrlKey: false }
      const isModEvent = (_evt?: RawMouseEventData | null) => false
      expect(resolveModClickLeaf(fakeEvent, isModEvent)).toBeNull()
    })
  })

  describe('resolveSourceNoteFile', () => {
    it('returns file from vault.getAbstractFileByPath when present', () => {
      const mockFile = { path: 'Notes/Task.md', name: 'Task.md' }
      const app = {
        vault: {
          getAbstractFileByPath: (path: string) => (path === 'Notes/Task.md' ? mockFile : null),
        },
        metadataCache: {
          getFirstLinkpathDest: () => null,
        },
      }
      expect(resolveSourceNoteFile(app, 'Notes/Task.md')).toBe(mockFile)
    })

    it('falls back to metadataCache.getFirstLinkpathDest when vault lookup returns null', () => {
      const mockFile = { path: 'Notes/Alias.md', name: 'Alias.md' }
      const app = {
        vault: {
          getAbstractFileByPath: () => null,
        },
        metadataCache: {
          getFirstLinkpathDest: (linkpath: string, sourcePath: string) =>
            linkpath === 'Alias' && sourcePath === '' ? mockFile : null,
        },
      }
      expect(resolveSourceNoteFile(app, 'Alias')).toBe(mockFile)
    })

    it('returns null when neither vault nor metadataCache finds the file', () => {
      const app = {
        vault: {
          getAbstractFileByPath: () => null,
        },
        metadataCache: {
          getFirstLinkpathDest: () => null,
        },
      }
      expect(resolveSourceNoteFile(app, 'Missing.md')).toBeNull()
    })
  })
})
