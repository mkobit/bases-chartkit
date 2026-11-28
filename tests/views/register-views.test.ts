import { describe, it, expect, mock, spyOn, beforeAll, afterAll, afterEach } from 'bun:test'
import { parse as parseYaml } from 'yaml'
import * as echarts from 'echarts'
import type { BasesAllOptions, BasesViewRegistration } from 'obsidian'
import type {
  CHART_VIEW_REGISTRATIONS as ChartViewRegistrationsType,
  registerChartViews as registerChartViewsType,
} from '../../src/views/register-views'

interface MockDomElement {
  readonly className: string
  readonly clientWidth: number
  readonly style: Record<string, string>
  readonly classList: {
    readonly add: (cls: string) => void
    readonly remove: (cls: string) => void
    readonly contains: (cls: string) => boolean
  }
  readonly createDiv: (opts?: { readonly cls?: string }) => MockDomElement
  readonly setText: () => void
}

function createMockElement(cls = ''): MockDomElement {
  return {
    className: cls,
    clientWidth: 640,
    style: {},
    classList: {
      add: () => undefined,
      remove: () => undefined,
      contains: () => false,
    },
    createDiv: (opts?: { readonly cls?: string }) => createMockElement(opts?.cls ?? ''),
    setText: () => undefined,
  }
}

class MockBasesView {
  config: {
    get: (key: string) => unknown
    getAsPropertyId: () => undefined
    getDisplayName: (id: string) => string
  } = {
    get: () => undefined,
    getAsPropertyId: () => undefined,
    getDisplayName: (id: string) => id.replace(/^note\./, ''),
  }

  data: {
    data: readonly unknown[]
    properties: readonly string[]
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

  setAllProperties(): void {}

  setData(data: { data: readonly unknown[]; properties: readonly string[] }): void {
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
  Notice: class {},
  Platform: { isMobile: false },
  parseYaml,
}))

interface CustomThemeSetting {
  readonly name: string
  readonly json: string
}

function makePluginStub(
  initialCustomThemes: readonly CustomThemeSetting[] = [],
  selectedTheme = 'default',
): any {
  let registeredEntries: readonly (readonly [string, BasesViewRegistration])[] = []
  let customThemes = initialCustomThemes
  return {
    get settings() {
      return {
        defaultHeight: '400px',
        selectedTheme,
        customThemes,
        upColor: '#14b143',
        downColor: '#ef232a',
      }
    },
    setCustomThemes: (nextThemes: readonly CustomThemeSetting[]) => {
      customThemes = nextThemes
    },
    getRegisteredEntries: () => registeredEntries,
    getRegistration: (type: string) => registeredEntries.find(([t]) => t === type)?.[1],
    registerBasesView: (type: string, registration: BasesViewRegistration) => {
      registeredEntries = [...registeredEntries, [type, registration]]
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

function makeViewConfigStub(): any {
  return {}
}

function findThemeDropdown(
  options: readonly BasesAllOptions[],
): Record<string, string> | undefined {
  const themeOption = options.find(
    option => 'key' in option && option.key === 'theme' && option.type === 'dropdown',
  )
  return themeOption && 'key' in themeOption && themeOption.type === 'dropdown'
    ? themeOption.options
    : undefined
}

describe('Chart view registration and custom themes', () => {
  const hadActiveDocument = 'activeDocument' in globalThis
  const previousActiveDocument: unknown = Reflect.get(globalThis, 'activeDocument')
  const hadWindow = 'window' in globalThis
  const previousWindow: unknown = Reflect.get(globalThis, 'window')
  const hadDocument = 'document' in globalThis
  const previousDocument: unknown = Reflect.get(globalThis, 'document')

  let registerChartViews: typeof registerChartViewsType
  let chartViewRegistrations: typeof ChartViewRegistrationsType
  let initSpy: { mockRestore: () => void } | null = null

  beforeAll(async () => {
    if (!hadWindow) {
      Reflect.set(globalThis, 'window', globalThis)
    }
    if (!hadDocument) {
      Reflect.set(globalThis, 'document', {
        createElement: () => ({
          getContext: () => ({
            getImageData: () => ({ data: [] }),
            fillText: () => undefined,
            measureText: () => ({ width: 10 }),
          }),
        }),
      })
    }
    if (!hadActiveDocument) {
      Reflect.set(globalThis, 'activeDocument', {
        body: { classList: { contains: () => false } },
      })
    }
    const [registerMod, i18nMod] = await Promise.all([
      import('../../src/views/register-views'),
      import('../../src/lang/i18n'),
    ])
    registerChartViews = registerMod.registerChartViews
    chartViewRegistrations = registerMod.CHART_VIEW_REGISTRATIONS
    await i18nMod.initializeI18n()
  })

  afterEach(() => {
    initSpy?.mockRestore()
    initSpy = null
  })

  afterAll(() => {
    if (!hadActiveDocument) {
      Reflect.deleteProperty(globalThis, 'activeDocument')
    } else {
      Reflect.set(globalThis, 'activeDocument', previousActiveDocument)
    }
    if (!hadDocument) {
      Reflect.deleteProperty(globalThis, 'document')
    } else {
      Reflect.set(globalThis, 'document', previousDocument)
    }
    if (!hadWindow) {
      Reflect.deleteProperty(globalThis, 'window')
    } else {
      Reflect.set(globalThis, 'window', previousWindow)
    }
  })

  it('includes saved custom themes in theme dropdown options for every registered view', () => {
    const plugin = makePluginStub([
      { name: 'Brand Light', json: '{"color":["#112233"]}' },
      { name: 'Ocean Dark', json: '{"color":["#445566"]}' },
    ])

    registerChartViews(plugin)

    const entries: readonly (readonly [string, BasesViewRegistration])[] =
      plugin.getRegisteredEntries()
    expect(entries).toHaveLength(chartViewRegistrations.length)

    entries.forEach(([type, registration]) => {
      const options = registration.options?.(makeViewConfigStub()) ?? []
      const themeOptions = findThemeDropdown(options)
      expect(themeOptions, `missing theme dropdown for ${type}`).toBeDefined()
      expect(themeOptions?.['default']).toBeString()
      expect(themeOptions?.['Brand Light']).toBe('Brand Light')
      expect(themeOptions?.['Ocean Dark']).toBe('Ocean Dark')
    })
  })

  it('reflects newly saved custom themes when view options are reopened after registration', () => {
    const plugin = makePluginStub([])
    registerChartViews(plugin)

    expect(
      findThemeDropdown(plugin.getRegistration('bar-chart')?.options?.(makeViewConfigStub()) ?? []),
    ).not.toHaveProperty('Sunset')

    plugin.setCustomThemes([{ name: 'Sunset', json: '{"color":["#ff6600"]}' }])

    const barThemeOptions = findThemeDropdown(
      plugin.getRegistration('bar-chart')?.options?.(makeViewConfigStub()) ?? [],
    )
    const pieThemeOptions = findThemeDropdown(
      plugin.getRegistration('pie-chart')?.options?.(makeViewConfigStub()) ?? [],
    )

    expect(barThemeOptions?.['Sunset']).toBe('Sunset')
    expect(pieThemeOptions?.['Sunset']).toBe('Sunset')
  })

  it('applies persisted per-view custom themes independently across bar and pie views', () => {
    const plugin = makePluginStub(
      [
        { name: 'Brand Light', json: '{"color":["#112233"]}' },
        { name: 'Ocean Dark', json: '{"color":["#445566"]}' },
      ],
      'Brand Light',
    )
    registerChartViews(plugin)

    const mockChart: any = {
      setOption: () => undefined,
      resize: () => undefined,
      dispose: () => undefined,
      on: () => undefined,
      off: () => undefined,
    }
    const spy = spyOn(echarts, 'init').mockReturnValue(mockChart)
    initSpy = spy

    const barRegistration: BasesViewRegistration | undefined = plugin.getRegistration('bar-chart')
    const pieRegistration: BasesViewRegistration | undefined = plugin.getRegistration('pie-chart')
    expect(barRegistration).toBeDefined()
    expect(pieRegistration).toBeDefined()

    const sampleData = {
      data: [
        { note: { Category: 'Alpha', Amount: 10 } },
        { note: { Category: 'Beta', Amount: 20 } },
      ],
      properties: ['note.Category', 'note.Amount'],
    }

    const barView: any = barRegistration?.factory(makeControllerStub(), makeScrollElStub())
    const pieView: any = pieRegistration?.factory(makeControllerStub(), makeScrollElStub())

    const barConfigValues: Record<string, unknown> = {
      xAxisProp: 'note.Category',
      yAxisProp: 'note.Amount',
      theme: 'Ocean Dark',
    }
    const pieConfigValues: Record<string, unknown> = {
      xAxisProp: 'note.Category',
      yAxisProp: 'note.Amount',
      theme: 'default',
    }

    Reflect.set(barView, 'config', {
      get: (key: string) => barConfigValues[key],
      getAsPropertyId: () => undefined,
      getDisplayName: (id: string) => id.replace(/^note\./, ''),
    })
    Reflect.set(barView, 'data', sampleData)

    Reflect.set(pieView, 'config', {
      get: (key: string) => pieConfigValues[key],
      getAsPropertyId: () => undefined,
      getDisplayName: (id: string) => id.replace(/^note\./, ''),
    })
    Reflect.set(pieView, 'data', sampleData)

    barView.onDataUpdated()
    pieView.onDataUpdated()

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[0]?.[1]).toBe('Ocean Dark')
    expect(spy.mock.calls[1]?.[1]).toBe('Brand Light')
  })
})
