import type {
  QueryController,
  ViewOption } from 'obsidian'
import {
  BasesView,
  Platform,
} from 'obsidian'
import * as echarts from 'echarts'
import type BarePlugin from '../main'
import type { EChartsOption } from 'echarts'
import type { BasesData, BaseTransformerOptions, VisualMapOptions } from '../charts/transformers/base'
import { ChartModal } from './chart-modal'
import { t } from '../lang/text'

export abstract class BaseChartView extends BasesView {
  readonly scrollEl: HTMLElement
  readonly containerEl: HTMLElement
  readonly chartEl: HTMLElement
  readonly plugin: BarePlugin
  protected chart: echarts.ECharts | null = null
  private resizeObserver: ResizeObserver | null = null
  private isFullScreenGeneration = false
  private resizeTimeout: number | null = null

  // Common Config Keys
  public static readonly X_AXIS_PROP_KEY = 'xAxisProp'
  public static readonly Y_AXIS_PROP_KEY = 'yAxisProp'
  public static readonly SERIES_PROP_KEY = 'seriesProp'
  public static readonly LEGEND_KEY = 'showLegend'
  public static readonly LEGEND_POSITION_KEY = 'legendPosition'
  public static readonly LEGEND_ORIENT_KEY = 'legendOrient'
  public static readonly HEIGHT_KEY = 'height'
  public static readonly THEME_KEY = 'theme'

  // New Config Keys (Made public for easier access in subclasses without casting)
  public static readonly SIZE_PROP_KEY = 'sizeProp'
  public static readonly MIN_VALUE_KEY = 'minVal'
  public static readonly MAX_VALUE_KEY = 'maxVal'
  public static readonly VALUE_PROP_KEY = 'valueProp'

  // Axis Config Keys
  public static readonly X_AXIS_LABEL_KEY = 'xAxisLabel'
  public static readonly Y_AXIS_LABEL_KEY = 'yAxisLabel'
  public static readonly X_AXIS_LABEL_ROTATE_KEY = 'xAxisLabelRotate'
  public static readonly FLIP_AXIS_KEY = 'flipAxis'

  // Visual Map Config Keys
  public static readonly VISUAL_MAP_MIN_KEY = 'visualMapMin'
  public static readonly VISUAL_MAP_MAX_KEY = 'visualMapMax'
  public static readonly VISUAL_MAP_COLOR_KEY = 'visualMapColor'
  public static readonly VISUAL_MAP_ORIENT_KEY = 'visualMapOrient'
  public static readonly VISUAL_MAP_TYPE_KEY = 'visualMapType'

  constructor(controller: Readonly<QueryController>, scrollEl: Readonly<HTMLElement>, plugin: Readonly<BarePlugin>) {
    super(controller)
    this.scrollEl = scrollEl
    this.plugin = plugin
    this.containerEl = this.scrollEl.createDiv({ cls: 'bases-echarts-container' })
    this.chartEl = this.containerEl.createDiv({ cls: 'bases-echarts' })
  }

  onload(): void {
    this.registerEvent(this.app.workspace.on(
      'css-change',
      this.updateChartTheme,
      this,
    ))

    this.resizeObserver = new ResizeObserver((_entries) => {
      this.triggerResize()
    })
    this.resizeObserver.observe(this.containerEl)

    // NOTE: `(this as unknown as ItemView).addAction(...)` used to register a
    // "Full Screen" toolbar button here. That cast was a lie — `BasesView`
    // (our actual parent) does not extend ItemView, so `addAction` was
    // undefined at runtime and threw on first view load. Re-add a fullscreen
    // affordance via the proper Bases API (or a command) in a follow-up.
  }

  onunload() {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.chart?.dispose()
    this.chart = null
  }

  private triggerResize(): void {
    if (this.resizeTimeout !== null) {
      window.clearTimeout(this.resizeTimeout)
    }
    this.resizeTimeout = window.setTimeout(() => {
      // Only resize an already-mounted chart. Don't initiate the first render
      // from a ResizeObserver — `this.config` isn't set until Obsidian invokes
      // the BasesView lifecycle (which calls `onDataUpdated`).
      this.chart?.resize()
    }, 100)
  }

  onResize(): void {
    this.triggerResize()
  }

  onDataUpdated(): void {
    this.renderChart()
  }

  protected getBooleanOption(key: string): boolean | undefined {
    const val = this.config.get(key)
    return typeof val === 'boolean' ? val : undefined
  }

  protected getStringOption(key: string): string | undefined {
    const val = this.config.get(key)
    return typeof val === 'string' ? val : undefined
  }

  protected getVisualMapTransformerOptions(): VisualMapOptions {
    const visualMapMin = this.config.get(BaseChartView.VISUAL_MAP_MIN_KEY) ? Number(this.config.get(BaseChartView.VISUAL_MAP_MIN_KEY)) : undefined
    const visualMapMax = this.config.get(BaseChartView.VISUAL_MAP_MAX_KEY) ? Number(this.config.get(BaseChartView.VISUAL_MAP_MAX_KEY)) : undefined
    const visualMapColor = (this.config.get(BaseChartView.VISUAL_MAP_COLOR_KEY) as string)?.split(',').map(s => s.trim()).filter(Boolean)
    const visualMapOrient = this.config.get(BaseChartView.VISUAL_MAP_ORIENT_KEY) as 'horizontal' | 'vertical' | undefined
    const visualMapType = this.config.get(BaseChartView.VISUAL_MAP_TYPE_KEY) as 'continuous' | 'piecewise' | undefined

    return {
      visualMapMin: !Number.isNaN(visualMapMin) ? visualMapMin : undefined,
      visualMapMax: !Number.isNaN(visualMapMax) ? visualMapMax : undefined,
      visualMapColor: visualMapColor && visualMapColor.length > 0 ? visualMapColor : undefined,
      visualMapOrient,
      visualMapType,
    }
  }

  protected getCommonTransformerOptions(): BaseTransformerOptions {
    const options: BaseTransformerOptions = {
      legend: this.getBooleanOption(BaseChartView.LEGEND_KEY),
      legendPosition: this.config.get(BaseChartView.LEGEND_POSITION_KEY) as 'top' | 'bottom' | 'left' | 'right',
      legendOrient: this.config.get(BaseChartView.LEGEND_ORIENT_KEY) as 'horizontal' | 'vertical',
      flipAxis: this.getBooleanOption(BaseChartView.FLIP_AXIS_KEY),
      xAxisLabel: this.getStringOption(BaseChartView.X_AXIS_LABEL_KEY),
      yAxisLabel: this.getStringOption(BaseChartView.Y_AXIS_LABEL_KEY),
      xAxisLabelRotate: Number(this.config.get(BaseChartView.X_AXIS_LABEL_ROTATE_KEY) || 0),
      isMobile: Platform.isMobile,
      containerWidth: this.containerEl ? this.containerEl.clientWidth : 0,
      upColor: this.plugin.settings.upColor,
      downColor: this.plugin.settings.downColor,
    }

    if (this.isFullScreenGeneration) {
      return {
        ...options,
        isMobile: false,
        containerWidth: activeWindow.innerWidth,
      }
    }

    return options
  }

  private openFullScreen() {
    this.isFullScreenGeneration = true
    const data = this.data.data as unknown as BasesData
    const option = this.getChartOption(data)
    this.isFullScreenGeneration = false

    if (option) {
      new ChartModal(this.app, option).open()
    }
  }

  protected renderChart(): void {
    // Guard: Obsidian sets `this.config` after construction but before
    // `onDataUpdated`. Any early caller (e.g. a ResizeObserver) would otherwise
    // crash inside `executeRender` → `getStringOption` → `this.config.get(...)`.
    if (!this.chartEl || !this.config) {
      return
    }
    this.executeRender()
  }

  protected executeRender(): void {
    const height = this.getStringOption(BaseChartView.HEIGHT_KEY) || this.plugin.settings.defaultHeight
    this.chartEl.style.height = height

    this.chart
      ? this.chart.resize()
      : (this.chart = echarts.init(
          this.chartEl,
          this.getTheme(),
        ))

    const data = this.data.data as unknown as BasesData
    const option = this.getChartOption(data)

    option
      ? this.chart.setOption(
          option,
          true,
        )
      : this.chart.clear()
  }

  protected abstract getChartOption(data: BasesData): EChartsOption | null

  private readonly updateChartTheme = (): void => {
    this.chart && (
      this.chart.dispose(),
      this.chart = echarts.init(
        this.chartEl,
        this.getTheme(),
      ),
      this.renderChart()
    )
  }

  private getTheme(): string | undefined {
    const chartTheme = this.getStringOption(BaseChartView.THEME_KEY)
    if (chartTheme && chartTheme !== 'default') {
      return chartTheme
    }

    if (this.plugin.settings.selectedTheme) {
      return this.plugin.settings.selectedTheme
    }

    return this.isDarkMode() ? 'dark' : undefined
  }

  private isDarkMode(): boolean {
    return activeDocument.body.classList.contains('theme-dark')
  }

  static getCommonViewOptions(plugin?: BarePlugin): ViewOption[] {
    const themeOptions: Record<string, string> = {
      default: t('views.common.theme_default'),
    }

    if (plugin) {
      plugin.settings.customThemes.forEach((t) => {
        themeOptions[t.name] = t.name
      })
    }

    return [
      {
        displayName: t('views.common.theme'),
        type: 'dropdown',
        key: BaseChartView.THEME_KEY,
        options: themeOptions,
      },
      {
        displayName: t('views.common.x_axis_prop'),
        type: 'property',
        key: BaseChartView.X_AXIS_PROP_KEY,
        placeholder: t('views.common.x_axis_prop_placeholder'),
      },
      {
        displayName: t('views.common.y_axis_prop'),
        type: 'property',
        key: BaseChartView.Y_AXIS_PROP_KEY,
        placeholder: t('views.common.y_axis_prop_placeholder'),
      },
      {
        displayName: t('views.common.series_prop'),
        type: 'property',
        key: BaseChartView.SERIES_PROP_KEY,
        placeholder: t('views.common.series_prop_placeholder'),
      },
      {
        displayName: t('views.common.show_legend'),
        type: 'toggle',
        key: BaseChartView.LEGEND_KEY,
      },
      {
        displayName: t('views.common.legend_position'),
        type: 'dropdown',
        key: BaseChartView.LEGEND_POSITION_KEY,
        options: {
          top: t('views.common.legend_position_options.top'),
          bottom: t('views.common.legend_position_options.bottom'),
          left: t('views.common.legend_position_options.left'),
          right: t('views.common.legend_position_options.right'),
        },
      },
      {
        displayName: t('views.common.legend_orient'),
        type: 'dropdown',
        key: BaseChartView.LEGEND_ORIENT_KEY,
        options: {
          horizontal: t('views.common.legend_orient_options.horizontal'),
          vertical: t('views.common.legend_orient_options.vertical'),
        },
      },
      {
        displayName: t('views.common.height'),
        type: 'text',
        key: BaseChartView.HEIGHT_KEY,
        placeholder: t('views.common.height_placeholder'),
      },
    ]
  }

  static getAxisViewOptions(): ViewOption[] {
    return [
      {
        displayName: t('views.axis.x_label'),
        type: 'text',
        key: BaseChartView.X_AXIS_LABEL_KEY,
        placeholder: t('views.axis.x_label_placeholder'),
      },
      {
        displayName: t('views.axis.y_label'),
        type: 'text',
        key: BaseChartView.Y_AXIS_LABEL_KEY,
        placeholder: t('views.axis.y_label_placeholder'),
      },
      {
        displayName: t('views.axis.x_rotate'),
        type: 'text',
        key: BaseChartView.X_AXIS_LABEL_ROTATE_KEY,
        placeholder: t('views.axis.x_rotate_placeholder'),
      },
      {
        displayName: t('views.axis.flip'),
        type: 'toggle',
        key: BaseChartView.FLIP_AXIS_KEY,
      },
    ]
  }

  static getVisualMapViewOptions(): ViewOption[] {
    return [
      {
        displayName: t('views.visual_map.min'),
        type: 'text',
        key: BaseChartView.VISUAL_MAP_MIN_KEY,
        placeholder: t('views.visual_map.min_placeholder'),
      },
      {
        displayName: t('views.visual_map.max'),
        type: 'text',
        key: BaseChartView.VISUAL_MAP_MAX_KEY,
        placeholder: t('views.visual_map.max_placeholder'),
      },
      {
        displayName: t('views.visual_map.colors'),
        type: 'text',
        key: BaseChartView.VISUAL_MAP_COLOR_KEY,
        placeholder: t('views.visual_map.colors_placeholder'),
      },
      {
        displayName: t('views.visual_map.orient'),
        type: 'text', // Ideally a dropdown, but ViewOption only supports basic types? Or use text with validation.
        key: BaseChartView.VISUAL_MAP_ORIENT_KEY,
        placeholder: t('views.visual_map.orient_placeholder'),
      },
      {
        displayName: t('views.visual_map.type'),
        type: 'text',
        key: BaseChartView.VISUAL_MAP_TYPE_KEY,
        placeholder: t('views.visual_map.type_placeholder'),
      },
    ]
  }
}
