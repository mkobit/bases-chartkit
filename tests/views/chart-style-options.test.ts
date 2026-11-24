import { describe, it, expect, mock, spyOn, beforeAll, afterAll, afterEach } from 'bun:test'
import { parse as parseYaml } from 'yaml'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import type { PieChartView as PieChartViewType } from '../../src/views/pie-chart-view'
import type { RadarChartView as RadarChartViewType } from '../../src/views/radar-chart-view'
import type { RoseChartView as RoseChartViewType } from '../../src/views/rose-chart-view'

interface MockDomElement {
  readonly className: string
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

describe('Chart view style options', () => {
  const hadActiveDocument = 'activeDocument' in globalThis
  const previousActiveDocument: unknown = Reflect.get(globalThis, 'activeDocument')

  let PieChartView: typeof PieChartViewType
  let RadarChartView: typeof RadarChartViewType
  let RoseChartView: typeof RoseChartViewType
  let initSpy: { mockRestore: () => void } | null = null

  beforeAll(async () => {
    const [pieMod, radarMod, roseMod, i18nMod] = await Promise.all([
      import('../../src/views/pie-chart-view'),
      import('../../src/views/radar-chart-view'),
      import('../../src/views/rose-chart-view'),
      import('../../src/lang/i18n'),
    ])
    PieChartView = pieMod.PieChartView
    RadarChartView = radarMod.RadarChartView
    RoseChartView = roseMod.RoseChartView
    await i18nMod.initializeI18n()
    if (!hadActiveDocument) {
      Reflect.set(globalThis, 'activeDocument', {
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
      Reflect.deleteProperty(globalThis, 'activeDocument')
    }
    else {
      Reflect.set(globalThis, 'activeDocument', previousActiveDocument)
    }
  })

  function renderAndCaptureOption(view: any): EChartsOption {
    const setOptionMock = mock((_option: EChartsOption) => undefined)
    const mockChart: any = {
      setOption: setOptionMock,
      resize: () => undefined,
      dispose: () => undefined,
      on: () => undefined,
      off: () => undefined,
    }
    initSpy = spyOn(echarts, 'init').mockReturnValue(mockChart)

    view.onDataUpdated()

    expect(setOptionMock).toHaveBeenCalledTimes(1)
    const firstCall = setOptionMock.mock.calls[0]
    return firstCall?.[0] ?? {}
  }

  function configureView(
    view: any,
    entries: Readonly<Record<string, unknown>>,
    data: { readonly data: readonly unknown[], readonly properties: readonly string[] },
  ): void {
    Reflect.set(view, 'config', {
      get: (key: string) => entries[key],
      getAsPropertyId: () => undefined,
      getDisplayName: (id: string) => id.replace(/^note\./, ''),
    })
    Reflect.set(view, 'data', data)
  }

  it('passes PieChartView innerRadius, outerRadius, padAngle, and borderRadius to ECharts', () => {
    const view: any = new PieChartView(makeControllerStub(), makeScrollElStub(), makePluginStub())
    configureView(
      view,
      {
        xAxisProp: 'note.Region',
        yAxisProp: 'note.Revenue',
        innerRadius: '40%',
        outerRadius: '70%',
        padAngle: 5,
        borderRadius: 8,
      },
      {
        data: [
          { note: { Region: 'North', Revenue: 100 } },
          { note: { Region: 'South', Revenue: 200 } },
        ],
        properties: ['note.Region', 'note.Revenue'],
      },
    )

    const option = renderAndCaptureOption(view)
    const series = Array.isArray(option.series) ? option.series[0] : option.series
    expect(series?.type).toBe('pie')
    if (series?.type === 'pie') {
      expect(series.radius).toEqual(['40%', '70%'])
      expect(series.padAngle).toBe(5)
      expect(series.itemStyle?.borderRadius).toBe(8)
    }
  })

  it('passes RadarChartView shape: circle and areaStyle: true to ECharts', () => {
    const view: any = new RadarChartView(makeControllerStub(), makeScrollElStub(), makePluginStub())
    configureView(
      view,
      {
        xAxisProp: 'note.Name',
        metricProps: 'note.Strength, note.Dexterity',
        shape: 'circle',
        areaStyle: true,
      },
      {
        data: [
          { note: { Name: 'Hero', Strength: 18, Dexterity: 14 } },
        ],
        properties: ['note.Name', 'note.Strength', 'note.Dexterity'],
      },
    )

    const option = renderAndCaptureOption(view)
    const radar = Array.isArray(option.radar) ? option.radar[0] : option.radar
    expect(radar?.shape).toBe('circle')

    const series = Array.isArray(option.series) ? option.series[0] : option.series
    expect(series?.type).toBe('radar')
    if (series?.type === 'radar') {
      expect(series.areaStyle).toEqual({})
    }
  })

  it('passes RoseChartView roseType, padAngle, and borderRadius to ECharts', () => {
    const view: any = new RoseChartView(makeControllerStub(), makeScrollElStub(), makePluginStub())
    configureView(
      view,
      {
        xAxisProp: 'note.Department',
        yAxisProp: 'note.Spend',
        roseType: 'radius',
        padAngle: 2,
        borderRadius: 4,
      },
      {
        data: [
          { note: { Department: 'Engineering', Spend: 500 } },
          { note: { Department: 'Design', Spend: 300 } },
        ],
        properties: ['note.Department', 'note.Spend'],
      },
    )

    const option = renderAndCaptureOption(view)
    const series = Array.isArray(option.series) ? option.series[0] : option.series
    expect(series?.type).toBe('pie')
    if (series?.type === 'pie') {
      expect(series.roseType).toBe('radius')
      expect(series.padAngle).toBe(2)
      expect(series.itemStyle?.borderRadius).toBe(4)
    }
  })

  it('auto-rotates many-category x-axis labels when xAxisLabelRotate is omitted on a view', async () => {
    const { LineChartView } = await import('../../src/views/line-chart-view')
    const view: any = new LineChartView(makeControllerStub(), makeScrollElStub(), makePluginStub())
    const rows = Array.from({ length: 25 }, (_, i) => ({
      note: { Date: `2024-01-${String(i + 1).padStart(2, '0')}`, Revenue: 100 + i },
    }))
    configureView(
      view,
      {
        xAxisProp: 'note.Date',
        yAxisProp: 'note.Revenue',
      },
      {
        data: rows,
        properties: ['note.Date', 'note.Revenue'],
      },
    )

    const option = renderAndCaptureOption(view)
    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
    expect(xAxis?.axisLabel?.rotate).toBe(45)
  })

  it('resolves gauge theme case-insensitively to the registered custom theme name', async () => {
    const echarts = await import('echarts')
    const { GaugeChartView } = await import('../../src/views/gauge-chart-view')
    const basePlugin = makePluginStub()
    const plugin = {
      ...basePlugin,
      settings: {
        ...basePlugin.settings,
        customThemes: [
          {
            name: 'Vintage',
            json: JSON.stringify({ color: ['#d87c7c', '#919e8b'], backgroundColor: 'rgba(254,248,239,1)' }),
          },
        ],
      },
    }

    const ssrChart = echarts.init(null, undefined, { renderer: 'svg', ssr: true, width: 100, height: 100 })
    const initSpy = spyOn(echarts, 'init').mockReturnValue(ssrChart)

    try {
      const view: any = new GaugeChartView(makeControllerStub(), makeScrollElStub(), plugin)
      configureView(
        view,
        {
          yAxisProp: 'note.SleepScore',
          theme: 'vintage',
          colorBands: '60:#e6a23c,80:#409eff,100:#67c23a',
        },
        {
          data: [{ note: { SleepScore: 82 } }],
          properties: ['note.SleepScore'],
        },
      )

      view.onDataUpdated()
      expect(initSpy).toHaveBeenCalled()
      expect(initSpy.mock.calls[0]?.[1]).toBe('Vintage')
    }
    finally {
      initSpy.mockRestore()
      ssrChart.dispose()
    }
  })
})
