import { describe, it, expect, mock, spyOn, beforeAll, afterAll, afterEach } from 'bun:test'
import { parse as parseYaml } from 'yaml'
import * as echarts from 'echarts'
import type { BasesPropertyId } from 'obsidian'
import type {
  EChartsView as EChartsViewType,
  mergeOrderedProperties as mergeOrderedPropertiesType,
  resolveEChartsOptionState as resolveEChartsOptionStateType,
} from '../../src/views/echarts-view'

interface MockDomElement {
  className: string
  readonly getText: () => string
  readonly style: Record<string, string>
  readonly classList: {
    readonly add: (cls: string) => void
    readonly remove: (cls: string) => void
    readonly contains: (cls: string) => boolean
  }
  readonly createDiv: (opts?: { readonly cls?: string }) => MockDomElement
  readonly setText: (text: string) => void
}

function createMockElement(cls = ''): MockDomElement {
  let classes: readonly string[] = cls ? cls.split(/\s+/).filter(Boolean) : []
  let text = ''
  const el: MockDomElement = {
    className: cls,
    getText: () => text,
    style: {},
    classList: {
      add: (c: string) => {
        if (!classes.includes(c)) {
          classes = [...classes, c]
        }
      },
      remove: (c: string) => {
        classes = classes.filter(item => item !== c)
      },
      contains: (c: string) => classes.includes(c),
    },
    createDiv: (opts?: { readonly cls?: string }) => createMockElement(opts?.cls ?? ''),
    setText: (nextText: string) => {
      text = nextText
    },
  }
  return el
}

class MockBasesView {
  config: {
    get: (key: string) => unknown
    getAsPropertyId: () => undefined
    getDisplayName: (id: string) => string
  } = {
    get: () => undefined,
    getAsPropertyId: () => undefined,
    getDisplayName: (id: string) => id,
  }

  allProperties: BasesPropertyId[] = []
  data: {
    data: readonly unknown[]
    properties: BasesPropertyId[]
  } = {
    data: [],
    properties: [],
  }

  app = {
    workspace: {
      on: () => ({}),
      openLinkText: () => Promise.resolve(),
      trigger: () => undefined,
    },
  }

  setConfigGetter(getter: (key: string) => unknown): void {
    this.config = {
      ...this.config,
      get: getter,
    }
  }

  setAllProperties(properties: BasesPropertyId[]): void {
    this.allProperties = properties
  }

  setData(data: { data: readonly unknown[], properties: BasesPropertyId[] }): void {
    this.data = data
  }
}

class MockExtraButtonComponent {
  setIcon(): this {
    return this
  }

  setTooltip(): this {
    return this
  }

  onClick(): this {
    return this
  }
}

void mock.module('obsidian', () => ({
  BasesView: MockBasesView,
  ExtraButtonComponent: MockExtraButtonComponent,
  Keymap: {
    isModEvent: () => false,
    isModifier: () => false,
  },
  Menu: class {},
  Modal: class {},
  Platform: { isMobile: false },
  parseYaml,
}))

let EChartsView: typeof EChartsViewType
let mergeOrderedProperties: typeof mergeOrderedPropertiesType
let resolveEChartsOptionState: typeof resolveEChartsOptionStateType

function makePluginStub(): any {
  return {
    settings: {
      defaultHeight: '400px',
      selectedTheme: 'default',
      customThemes: [],
      upColor: '#14b143',
      downColor: '#ef232a',
    },
    registerChartView: () => undefined,
    unregisterChartView: () => undefined,
    setActiveChartView: () => undefined,
  }
}

function makeControllerStub(): any {
  return {}
}

function makeScrollElStub(): any {
  return createMockElement()
}

describe('EChartsView', () => {
  const hadActiveDocument = 'activeDocument' in global
  const previousActiveDocument: unknown = Reflect.get(global, 'activeDocument')
  let initSpy: { mockRestore: () => void } | null = null

  beforeAll(async () => {
    const viewMod = await import('../../src/views/echarts-view')
    EChartsView = viewMod.EChartsView
    mergeOrderedProperties = viewMod.mergeOrderedProperties
    resolveEChartsOptionState = viewMod.resolveEChartsOptionState
    const i18nMod = await import('../../src/lang/i18n')
    await i18nMod.initializeI18n()
    if (!hadActiveDocument) {
      Reflect.set(global, 'activeDocument', {
        body: { classList: { contains: () => false } },
      })
    }
  })

  afterEach(() => {
    initSpy?.mockRestore()
    initSpy = null
  })

  afterAll(() => {
    if (!hadActiveDocument) {
      Reflect.deleteProperty(global, 'activeDocument')
    }
    else {
      Reflect.set(global, 'activeDocument', previousActiveDocument)
    }
  })

  describe('mergeOrderedProperties', () => {
    it('places visible properties first and appends remaining allProperties without duplicates', () => {
      const visible: readonly BasesPropertyId[] = ['note.b', 'note.a']
      const all: readonly BasesPropertyId[] = ['note.a', 'note.c', 'note.b', 'file.name']
      expect(mergeOrderedProperties(visible, all)).toEqual([
        'note.b',
        'note.a',
        'note.c',
        'file.name',
      ])
    })
  })

  describe('resolveEChartsOptionState', () => {
    const entries = [
      {
        file: { path: 'notes/item.md' },
        getValue: (id: BasesPropertyId) => (id === 'note.label' ? { toString: () => 'Item' } : { data: 10, toString: () => '10' }),
      },
    ]
    const props: readonly BasesPropertyId[] = ['note.label', 'note.value']

    it('returns empty state for undefined, null, whitespace, and comment-only strings', () => {
      expect(resolveEChartsOptionState(undefined, entries, props, parseYaml)).toEqual({
        state: { kind: 'empty' },
        option: null,
      })
      expect(resolveEChartsOptionState(null, entries, props, parseYaml)).toEqual({
        state: { kind: 'empty' },
        option: null,
      })
      expect(resolveEChartsOptionState('   \n  ', entries, props, parseYaml)).toEqual({
        state: { kind: 'empty' },
        option: null,
      })
      expect(resolveEChartsOptionState('# comment\n  # another', entries, props, parseYaml)).toEqual({
        state: { kind: 'empty' },
        option: null,
      })
    })

    it('parses YAML string echartsOption and injects bases dataset', () => {
      const yaml = `
dataset:
  id: bases
series:
  - type: bar
    encode:
      x: note.label
      y: note.value
`
      const result = resolveEChartsOptionState(yaml, entries, props, parseYaml)
      expect(result.state).toEqual({ kind: 'ready' })
      expect(result.option?.dataset).toEqual({
        id: 'bases',
        dimensions: ['note.label', 'note.value'],
        source: [{ '_file': 'notes/item.md', 'note.label': 'Item', 'note.value': 10 }],
      })
    })

    it('accepts pre-parsed plain-object echartsOption', () => {
      const optionObj = {
        dataset: { id: 'bases' },
        series: [{ type: 'line' }],
      }
      const result = resolveEChartsOptionState(optionObj, entries, props, parseYaml)
      expect(result.state).toEqual({ kind: 'ready' })
      expect(result.option?.series).toEqual([{ type: 'line' }])
    })

    it('returns error state on malformed YAML', () => {
      const result = resolveEChartsOptionState('dataset: [unclosed', entries, props, parseYaml)
      expect(result.option).toBeNull()
      expect(result.state.kind).toBe('error')
    })

    it('returns error state on non-object YAML root', () => {
      const result = resolveEChartsOptionState('- item1\n- item2', entries, props, parseYaml)
      expect(result.option).toBeNull()
      expect(result.state.kind).toBe('error')
    })

    it('returns error state when dataset contract fails', () => {
      const result = resolveEChartsOptionState({ series: [] }, entries, props, parseYaml)
      expect(result.option).toBeNull()
      expect(result.state.kind).toBe('error')
    })
  })

  describe('view lifecycle and rendering', () => {
    it('disables dataIndex/rowIndex interactivity fallback via getInteractivityData()', () => {
      const view = new EChartsView(makeControllerStub(), makeScrollElStub(), makePluginStub())
      expect(view.type).toBe('echarts')
      expect(Reflect.get(view, 'getInteractivityData').call(view)).toBeUndefined()
    })

    it('shows prompt on empty echartsOption without initializing chart, then initializes after unhiding when ready', () => {
      let hiddenDuringSetOption = true
      const setOptionMock = mock(() => {
        hiddenDuringSetOption = view.chartEl.classList.contains('bases-echarts-hidden')
      })
      const clearMock = mock(() => undefined)
      const disposeMock = mock(() => undefined)
      const resizeMock = mock(() => undefined)
      const onMock = mock(() => undefined)
      const mockChart: any = {
        setOption: setOptionMock,
        clear: clearMock,
        dispose: disposeMock,
        resize: resizeMock,
        on: onMock,
      }
      const view: any = new EChartsView(makeControllerStub(), makeScrollElStub(), makePluginStub())
      initSpy = spyOn(echarts, 'init').mockReturnValue(mockChart)

      view.onDataUpdated()

      expect(initSpy).not.toHaveBeenCalled()
      expect(setOptionMock).not.toHaveBeenCalled()
      expect(view.chartEl.classList.contains('bases-echarts-hidden')).toBe(true)
      const statusEl: MockDomElement = Reflect.get(view, 'statusEl')
      expect(statusEl.classList.contains('bases-echarts-prompt')).toBe(true)
      expect(statusEl.classList.contains('bases-echarts-hidden')).toBe(false)
      expect(statusEl.getText().length).toBeGreaterThan(0)

      view.setConfigGetter((key: string) => (key === 'echartsOption' ? { dataset: { id: 'bases' }, series: [{ type: 'bar' }] } : undefined))
      view.onDataUpdated()

      expect(initSpy).toHaveBeenCalledTimes(1)
      expect(hiddenDuringSetOption).toBe(false)
      expect(setOptionMock).toHaveBeenCalledTimes(1)
      expect(statusEl.classList.contains('bases-echarts-hidden')).toBe(true)
    })

    it('disposes chart and renders YAML/dataset error into statusEl on onDataUpdated()', () => {
      const setOptionMock = mock(() => undefined)
      const disposeMock = mock(() => undefined)
      const mockChart: any = {
        setOption: setOptionMock,
        clear: () => undefined,
        dispose: disposeMock,
        resize: () => undefined,
        on: () => undefined,
      }
      initSpy = spyOn(echarts, 'init').mockReturnValue(mockChart)

      const view: any = new EChartsView(makeControllerStub(), makeScrollElStub(), makePluginStub())
      view.setConfigGetter((key: string) => (key === 'echartsOption' ? { dataset: { id: 'bases' }, series: [{ type: 'bar' }] } : undefined))
      view.onDataUpdated()
      expect(setOptionMock).toHaveBeenCalledTimes(1)

      view.setConfigGetter((key: string) => (key === 'echartsOption' ? { series: [{ type: 'bar' }] } : undefined))
      view.onDataUpdated()

      expect(disposeMock).toHaveBeenCalledTimes(1)
      expect(Reflect.get(view, 'chart')).toBeNull()
      expect(view.chartEl.classList.contains('bases-echarts-hidden')).toBe(true)
      const statusEl: MockDomElement = Reflect.get(view, 'statusEl')
      expect(statusEl.classList.contains('bases-echarts-error')).toBe(true)
      expect(statusEl.getText()).toContain('Invalid Bases dataset configuration:')
    })

    it('renders chart on valid echartsOption and disposes chart if setOption throws', () => {
      let shouldThrow = false
      const setOptionMock = mock(() => {
        if (shouldThrow) {
          JSON.parse('{invalid-echarts-option')
        }
      })
      const disposeMock = mock(() => undefined)
      const mockChart: any = {
        setOption: setOptionMock,
        clear: () => undefined,
        dispose: disposeMock,
        resize: () => undefined,
        on: () => undefined,
      }
      initSpy = spyOn(echarts, 'init').mockReturnValue(mockChart)

      const view: any = new EChartsView(makeControllerStub(), makeScrollElStub(), makePluginStub())
      view.setConfigGetter((key: string) => (key === 'echartsOption' ? { dataset: { id: 'bases' }, series: [{ type: 'bar' }] } : undefined))
      view.setAllProperties(['note.x'])
      view.setData({
        data: [
          {
            file: { path: 'notes/a.md' },
            getValue: () => ({ toString: () => 'A' }),
          },
        ],
        properties: ['note.x'],
      })

      view.onDataUpdated()
      expect(setOptionMock).toHaveBeenCalledTimes(1)
      expect(view.chartEl.classList.contains('bases-echarts-hidden')).toBe(false)

      shouldThrow = true
      view.onDataUpdated()
      expect(disposeMock).toHaveBeenCalledTimes(1)
      expect(Reflect.get(view, 'chart')).toBeNull()
      expect(view.chartEl.classList.contains('bases-echarts-hidden')).toBe(true)
      const statusEl: MockDomElement = Reflect.get(view, 'statusEl')
      expect(statusEl.classList.contains('bases-echarts-error')).toBe(true)
      expect(statusEl.getText()).toContain('Failed to render ECharts option:')
    })

    it('exposes echartsOption and host options in getViewOptions', () => {
      const options = EChartsView.getViewOptions(makePluginStub())
      const keys = options.map(opt => opt.key)
      expect(keys).toEqual(['echartsOption', 'theme', 'height'])
    })
  })
})
