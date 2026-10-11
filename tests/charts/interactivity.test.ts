import { describe, it, expect } from 'bun:test'
import {
  extractTargetFilePath,
  extractTargetFilePaths,
  extractRawMouseEvent,
  resolveModClickLeaf,
  resolveSourceNoteFile,
  formatDisambiguationLabel,
  buildDisambiguationChoices,
  populateDisambiguationMenu,
} from '../../src/charts/interactivity'
import type {
  RawMouseEventData,
  DisambiguationMenuItemLike,
  DisambiguationMenuLike,
} from '../../src/charts/interactivity'

class MockMenuItem implements DisambiguationMenuItemLike {
  public title = ''
  public icon = ''
  public triggerClick: () => void = () => {}

  setTitle(title: string) {
    this.title = title
    return this
  }

  setIcon(icon: string) {
    this.icon = icon
    return this
  }

  onClick(cb: (evt?: unknown) => unknown) {
    this.triggerClick = () => {
      cb()
    }
    return this
  }
}

class MockMenu implements DisambiguationMenuLike {
  public items: readonly MockMenuItem[] = []

  addItem(cb: (item: DisambiguationMenuItemLike) => unknown) {
    const item = new MockMenuItem()
    cb(item)
    this.items = [...this.items, item]
    return this
  }
}

class SelectionTracker {
  public selected: readonly string[] = []

  record(path: string) {
    this.selected = [...this.selected, path]
  }
}

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

  describe('extractTargetFilePaths', () => {
    it('extracts multiple filePaths directly from params.data.filePaths', () => {
      const params = {
        data: {
          name: 'Cluster A',
          value: 120,
          filePaths: ['Notes/Task A.md', 'Notes/Task B.md'],
        },
      }
      expect(extractTargetFilePaths(params)).toEqual(['Notes/Task A.md', 'Notes/Task B.md'])
    })

    it('filters empty strings, non-strings, and duplicates from filePaths preserving order', () => {
      const params = {
        data: {
          filePaths: ['Notes/First.md', '', 'Notes/Second.md', 'Notes/First.md'],
        },
      }
      expect(extractTargetFilePaths(params)).toEqual(['Notes/First.md', 'Notes/Second.md'])
    })

    it('resolves file paths from rowIndices mapped to data array', () => {
      const data = [
        { filePath: 'Notes/Zero.md' },
        { filePath: 'Notes/One.md' },
        { filePath: 'Notes/Two.md' },
      ]
      const params = {
        data: {
          rowIndices: [2, 0, 2],
        },
      }
      expect(extractTargetFilePaths(params, data)).toEqual(['Notes/Two.md', 'Notes/Zero.md'])
    })

    it('filters out-of-range or missing file paths from rowIndices', () => {
      const data = [
        { filePath: 'Notes/Zero.md' },
        { otherProp: 'No file path here' },
      ]
      const params = {
        data: {
          rowIndices: [0, 1, 99],
        },
      }
      expect(extractTargetFilePaths(params, data)).toEqual(['Notes/Zero.md'])
    })

    it('prefers filePaths over rowIndices when both are present', () => {
      const data = [
        { filePath: 'Notes/DataZero.md' },
      ]
      const params = {
        data: {
          filePaths: ['Notes/Direct.md'],
          rowIndices: [0],
        },
      }
      expect(extractTargetFilePaths(params, data)).toEqual(['Notes/Direct.md'])
    })

    it('falls back to rowIndices when filePaths is empty', () => {
      const data = [
        { filePath: 'Notes/DataZero.md' },
      ]
      const params = {
        data: {
          filePaths: [],
          rowIndices: [0],
        },
      }
      expect(extractTargetFilePaths(params, data)).toEqual(['Notes/DataZero.md'])
    })

    it('falls back to params.data.filePath as single-element list', () => {
      const params = {
        data: {
          filePath: 'Notes/Single.md',
        },
      }
      expect(extractTargetFilePaths(params)).toEqual(['Notes/Single.md'])
    })

    it('falls back to extractTargetFilePath for nested file or rowIndex/dataIndex', () => {
      const nestedParams = {
        data: {
          file: { path: 'Notes/Nested.md' },
        },
      }
      expect(extractTargetFilePaths(nestedParams)).toEqual(['Notes/Nested.md'])

      const data = [{ filePath: 'Notes/Indexed.md' }]
      const indexedParams = {
        data: [1, 2],
        dataIndex: 0,
      }
      expect(extractTargetFilePaths(indexedParams, data)).toEqual(['Notes/Indexed.md'])
    })

    it('returns empty array for invalid, missing, or empty parameters', () => {
      expect(extractTargetFilePaths(null)).toEqual([])
      expect(extractTargetFilePaths(undefined)).toEqual([])
      expect(extractTargetFilePaths('not-an-object')).toEqual([])
      expect(extractTargetFilePaths({ data: { filePath: '' } })).toEqual([])
      expect(extractTargetFilePaths({ data: { filePaths: ['', ''] } })).toEqual([])
      expect(extractTargetFilePaths({ data: { name: 'Folder', children: [] } })).toEqual([])
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

  describe('Disambiguation selector logic', () => {
    describe('formatDisambiguationLabel', () => {
      it('extracts filename from path containing folders', () => {
        expect(formatDisambiguationLabel('Folder/Subfolder/Project Note.md')).toBe('Project Note.md')
      })

      it('returns plain filename if no slash is present', () => {
        expect(formatDisambiguationLabel('Project Note.md')).toBe('Project Note.md')
      })

      it('returns empty string if empty path provided', () => {
        expect(formatDisambiguationLabel('')).toBe('')
      })
    })

    describe('buildDisambiguationChoices', () => {
      it('builds choices with filenames when filenames are unique', () => {
        const paths = ['Folder A/Task 1.md', 'Folder B/Task 2.md']
        expect(buildDisambiguationChoices(paths)).toEqual([
          { title: 'Task 1.md', filePath: 'Folder A/Task 1.md' },
          { title: 'Task 2.md', filePath: 'Folder B/Task 2.md' },
        ])
      })

      it('falls back to full paths when filenames collide', () => {
        const paths = ['Work/Meeting.md', 'Personal/Meeting.md']
        expect(buildDisambiguationChoices(paths)).toEqual([
          { title: 'Work/Meeting.md', filePath: 'Work/Meeting.md' },
          { title: 'Personal/Meeting.md', filePath: 'Personal/Meeting.md' },
        ])
      })

      it('deduplicates paths and filters empty strings', () => {
        const paths = ['Notes/A.md', '', 'Notes/A.md']
        expect(buildDisambiguationChoices(paths)).toEqual([
          { title: 'A.md', filePath: 'Notes/A.md' },
        ])
      })
    })

    describe('populateDisambiguationMenu', () => {
      it('populates menu items with title, icon, and onSelect callbacks', () => {
        const menu = new MockMenu()
        const tracker = new SelectionTracker()
        const paths = ['Folder/Note A.md', 'Folder/Note B.md']

        populateDisambiguationMenu(menu, paths, (filePath) => {
          tracker.record(filePath)
        })

        expect(menu.items).toHaveLength(2)
        expect(menu.items[0]?.title).toBe('Note A.md')
        expect(menu.items[0]?.icon).toBe('file-text')
        expect(menu.items[1]?.title).toBe('Note B.md')
        expect(menu.items[1]?.icon).toBe('file-text')

        menu.items[0]?.triggerClick()
        expect(tracker.selected).toEqual(['Folder/Note A.md'])

        menu.items[1]?.triggerClick()
        expect(tracker.selected).toEqual(['Folder/Note A.md', 'Folder/Note B.md'])
      })
    })
  })
})
