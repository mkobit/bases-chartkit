import type {
  BasesPropertyId,
  QueryController,
  BasesOptions } from 'obsidian'
import {
  BasesView,
  Platform,
} from 'obsidian'
import * as R from 'remeda'
import * as echarts from 'echarts'
import type BarePlugin from '../main'
import type { EChartsOption } from 'echarts'
import type { BasesData, BaseTransformerOptions, VisualMapOptions } from '../charts/transformers/base'
import { ChartModal } from './chart-modal'
import { t } from '../lang/text'
import { isRecord } from '../charts/transformers/utils'

export abstract class BaseChartView extends BasesView {
  readonly scrollEl: HTMLElement
  readonly containerEl: HTMLElement
  readonly chartEl: HTMLElement
  readonly plugin: BarePlugin
  protected chart: echarts.ECharts | null = null
  private resizeObserver: ResizeObserver | null = null
  private isFullScreenGeneration = false
  private resizeTimeout: number | null = null

  public static readonly X_AXIS_PROP_KEY = 'xAxisProp'
  public static readonly Y_AXIS_PROP_KEY = 'yAxisProp'
  public static readonly SERIES_PROP_KEY = 'seriesProp'
  public static readonly LEGEND_KEY = 'showLegend'
  public static readonly LEGEND_POSITION_KEY = 'legendPosition'
  public static readonly LEGEND_ORIENT_KEY = 'legendOrient'
  public static readonly HEIGHT_KEY = 'height'
  public static readonly THEME_KEY = 'theme'
  public static readonly ECHARTS_OPTION_KEY = 'echartsOption'
  public static readonly TITLE_KEY = 'title'
  public static readonly DESCRIPTION_KEY = 'description'

  public static readonly SIZE_PROP_KEY = 'sizeProp'
  public static readonly MIN_VALUE_KEY = 'minVal'
  public static readonly MAX_VALUE_KEY = 'maxVal'
  public static readonly VALUE_PROP_KEY = 'valueProp'
  public static readonly TOTAL_PROP_KEY = 'totalProp'
  public static readonly VALUE_FORMAT_KEY = 'valueFormat'

  public static readonly X_AXIS_LABEL_KEY = 'xAxisLabel'
  public static readonly Y_AXIS_LABEL_KEY = 'yAxisLabel'
  public static readonly X_AXIS_FORMAT_KEY = 'xAxisFormat'
  public static readonly Y_AXIS_FORMAT_KEY = 'yAxisFormat'
  public static readonly X_AXIS_LABEL_ROTATE_KEY = 'xAxisLabelRotate'
  public static readonly FLIP_AXIS_KEY = 'flipAxis'

  public static readonly VISUAL_MAP_MIN_KEY = 'visualMapMin'
  public static readonly VISUAL_MAP_MAX_KEY = 'visualMapMax'
  public static readonly VISUAL_MAP_COLOR_KEY = 'visualMapColor'
  public static readonly VISUAL_MAP_ORIENT_KEY = 'visualMapOrient'
  public static readonly VISUAL_MAP_TYPE_KEY = 'visualMapType'

  constructor(controller: Readonly<QueryController>, scrollEl: Readonly<HTMLElement>, plugin: Readonly<BarePlugin>) {
    super(controller)
    this.scrollEl = scrollEl
    this.plugin = plugin
    this.scrollEl.classList.add('bases-chart-scroll-container')
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

  // Falls back to undefined (not the raw property path) so callers can chain
  // further fallbacks.
  protected getPropDisplayName(key: string): string | undefined {
    const propertyId = this.config.getAsPropertyId(key)
    return propertyId ? this.config.getDisplayName(propertyId) : undefined
  }

  // For options where the user types raw property paths directly (e.g. a
  // comma-separated dimensions list) rather than through a `type: 'property'`
  // picker. The path is already in Bases' `type.name` id format, so it can be
  // resolved directly without going through getAsPropertyId first.
  protected getDisplayNameForPropertyPath(propertyPath: string): string {
    return this.config.getDisplayName(propertyPath as BasesPropertyId)
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
      title: this.getStringOption(BaseChartView.TITLE_KEY),
      description: this.getStringOption(BaseChartView.DESCRIPTION_KEY),
      legend: this.getBooleanOption(BaseChartView.LEGEND_KEY),
      legendPosition: this.config.get(BaseChartView.LEGEND_POSITION_KEY) as 'top' | 'bottom' | 'left' | 'right',
      legendOrient: this.config.get(BaseChartView.LEGEND_ORIENT_KEY) as 'horizontal' | 'vertical',
      flipAxis: this.getBooleanOption(BaseChartView.FLIP_AXIS_KEY),
      xAxisLabel: this.getStringOption(BaseChartView.X_AXIS_LABEL_KEY) ?? this.getPropDisplayName(BaseChartView.X_AXIS_PROP_KEY),
      yAxisLabel: this.getStringOption(BaseChartView.Y_AXIS_LABEL_KEY) ?? this.getPropDisplayName(BaseChartView.Y_AXIS_PROP_KEY),
      xAxisFormat: this.getStringOption(BaseChartView.X_AXIS_FORMAT_KEY),
      yAxisFormat: this.getStringOption(BaseChartView.Y_AXIS_FORMAT_KEY),
      valueFormat: this.getStringOption(BaseChartView.VALUE_FORMAT_KEY),
      xAxisLabelRotate: Number(this.config.get(BaseChartView.X_AXIS_LABEL_ROTATE_KEY) || 0),
      isMobile: Platform.isMobile,
      containerWidth: this.containerEl ? this.containerEl.clientWidth : 0,
      upColor: this.plugin.settings.upColor,
      downColor: this.plugin.settings.downColor,
      // Tied to getTheme()'s actual resolved theme (not the raw OS-level
      // isDarkMode() signal) so a selected custom theme -- which getTheme()
      // prioritizes over the OS dark-mode fallback -- isn't overridden by an
      // unrelated dark/light mismatch here.
      isDarkMode: this.getTheme() === 'dark',
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
    // eslint-disable-next-line no-restricted-syntax -- Obsidian's `BasesView.data.data` and our internal `BasesData` share the same name + shape but are declared in separate modules. TODO(cast-audit): rename internal type to remove the bridge.
    const data = this.data.data as unknown as BasesData
    const rawOption = this.getChartOption(data)
    const option = this.applyOptionOverride(rawOption)
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

    // eslint-disable-next-line no-restricted-syntax -- see openFullScreen above for the BasesData bridge.
    const data = this.data.data as unknown as BasesData
    const rawOption = this.getChartOption(data)
    const option = this.applyOptionOverride(rawOption)

    option
      ? this.chart.setOption(
          option,
          true,
        )
      : this.chart.clear()
  }

  private applyOptionOverride(option: EChartsOption | null): EChartsOption | null {
    if (!option) {
      return null
    }
    const rawOverride = this.config.get(BaseChartView.ECHARTS_OPTION_KEY)
    if (!rawOverride) {
      return option
    }

    try {
      const parsedOverride = typeof rawOverride === 'string'
        ? (JSON.parse(rawOverride) as Record<string, unknown>)
        : (isRecord(rawOverride) ? rawOverride : null)

      if (!parsedOverride) {
        return option
      }

      const optionRec: Record<string, unknown> = option
      return R.mergeDeep(optionRec, parsedOverride)
    }
    catch {
      return option
    }
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

  static getCommonViewOptions(plugin?: BarePlugin): BasesOptions[] {
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
      {
        displayName: t('views.common.value_format'),
        type: 'text',
        key: BaseChartView.VALUE_FORMAT_KEY,
        placeholder: t('views.common.value_format_placeholder'),
      },
      {
        displayName: t('views.common.title'),
        type: 'text',
        key: BaseChartView.TITLE_KEY,
        placeholder: t('views.common.title_placeholder'),
      },
      {
        displayName: t('views.common.description'),
        type: 'text',
        key: BaseChartView.DESCRIPTION_KEY,
        placeholder: t('views.common.description_placeholder'),
      },
      {
        displayName: t('views.common.echarts_option'),
        type: 'text',
        key: BaseChartView.ECHARTS_OPTION_KEY,
        placeholder: t('views.common.echarts_option_placeholder'),
      },
    ]
  }

  static getAxisViewOptions(): BasesOptions[] {
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
        displayName: t('views.axis.x_format'),
        type: 'text',
        key: BaseChartView.X_AXIS_FORMAT_KEY,
        placeholder: t('views.axis.x_format_placeholder'),
      },
      {
        displayName: t('views.axis.y_format'),
        type: 'text',
        key: BaseChartView.Y_AXIS_FORMAT_KEY,
        placeholder: t('views.axis.y_format_placeholder'),
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

  static getVisualMapViewOptions(): BasesOptions[] {
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
        type: 'dropdown',
        key: BaseChartView.VISUAL_MAP_ORIENT_KEY,
        options: {
          horizontal: t('views.visual_map.orient_options.horizontal'),
          vertical: t('views.visual_map.orient_options.vertical'),
        },
      },
      {
        displayName: t('views.visual_map.type'),
        type: 'dropdown',
        key: BaseChartView.VISUAL_MAP_TYPE_KEY,
        options: {
          continuous: t('views.visual_map.type_options.continuous'),
          piecewise: t('views.visual_map.type_options.piecewise'),
        },
      },
    ]
  }
}
