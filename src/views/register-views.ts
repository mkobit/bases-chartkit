import type { BasesOptions, BasesView, QueryController } from 'obsidian'
import type BarePlugin from '../main'
import type { RegisteredChartViewType } from '../charts/registered-views'
import { t } from '../lang/text'
import { AreaChartView } from './area-chart-view'
import { BarChartView } from './bar-chart-view'
import { BaseChartView } from './base-chart-view'
import { BoxplotChartView } from './boxplot-chart-view'
import { BubbleChartView } from './bubble-chart-view'
import { BulletChartView } from './bullet-chart-view'
import { CalendarChartView } from './calendar-chart-view'
import { CandlestickChartView } from './candlestick-chart-view'
import { ComboChartView } from './combo-chart-view'
import { EChartsView } from './echarts-view'
import { EffectScatterChartView } from './effect-scatter-chart-view'
import { FunnelChartView } from './funnel-chart-view'
import { GanttChartView } from './gantt-chart-view'
import { GaugeChartView } from './gauge-chart-view'
import { GraphChartView } from './graph-chart-view'
import { HeatmapChartView } from './heatmap-chart-view'
import { HistogramChartView } from './histogram-chart-view'
import { LineChartView } from './line-chart-view'
import { LinesChartView } from './lines-chart-view'
import { MapChartView } from './map-chart-view'
import { ParallelChartView } from './parallel-chart-view'
import { ParetoChartView } from './pareto-chart-view'
import { PictorialBarChartView } from './pictorial-bar-chart-view'
import { PieChartView } from './pie-chart-view'
import { PolarLineChartView } from './polar-line-chart-view'
import { PolarScatterChartView } from './polar-scatter-chart-view'
import { RadarChartView } from './radar-chart-view'
import { RadialBarChartView } from './radial-bar-chart-view'
import { RoseChartView } from './rose-chart-view'
import { SankeyChartView } from './sankey-chart-view'
import { ScatterChartView } from './scatter-chart-view'
import { StackedBarChartView } from './stacked-bar-chart-view'
import { SunburstChartView } from './sunburst-chart-view'
import { ThemeRiverChartView } from './theme-river-chart-view'
import { TreeChartView } from './tree-chart-view'
import { TreemapChartView } from './treemap-chart-view'
import { WaterfallChartView } from './waterfall-chart-view'
import { WordCloudChartView } from './word-cloud-chart-view'

interface ChartViewConstructor {
  new (controller: QueryController, containerEl: HTMLElement, plugin: BarePlugin): BasesView
  getViewOptions: () => BasesOptions[]
}

export interface ChartViewRegistration {
  readonly type: RegisteredChartViewType
  readonly getName: () => string
  readonly icon: string
  readonly factory: (
    controller: QueryController,
    containerEl: HTMLElement,
    plugin: BarePlugin,
  ) => BasesView
  readonly options: (plugin: BarePlugin) => BasesOptions[]
}

function withPluginThemeOptions(
  options: readonly BasesOptions[],
  plugin: BarePlugin,
): BasesOptions[] {
  const [themeHostOption] = BaseChartView.getHostViewOptions(plugin)
  if (!themeHostOption || themeHostOption.type !== 'dropdown') {
    return [...options]
  }

  const hasThemeOption = options.some(
    option => option.key === BaseChartView.THEME_KEY && option.type === 'dropdown',
  )

  if (!hasThemeOption) {
    return [themeHostOption, ...options]
  }

  return options.map(option =>
    option.key === BaseChartView.THEME_KEY && option.type === 'dropdown'
      ? {
          ...option,
          options: themeHostOption.options,
        }
      : option,
  )
}

function standardView(
  type: RegisteredChartViewType,
  getName: () => string,
  icon: string,
  ViewClass: ChartViewConstructor,
): ChartViewRegistration {
  return {
    type,
    getName,
    icon,
    factory: (controller, containerEl, plugin) => new ViewClass(controller, containerEl, plugin),
    options: plugin => withPluginThemeOptions(ViewClass.getViewOptions(), plugin),
  }
}

export const CHART_VIEW_REGISTRATIONS: readonly ChartViewRegistration[] = [
  standardView('treemap-chart', () => t('views.treemap.name'), 'layout-grid', TreemapChartView),
  standardView('bar-chart', () => t('views.bar.name'), 'bar-chart', BarChartView),
  standardView('line-chart', () => t('views.line.name'), 'activity', LineChartView),
  standardView('lines-chart', () => t('views.lines.name'), 'route', LinesChartView),
  standardView('pie-chart', () => t('views.pie.name'), 'pie-chart', PieChartView),
  standardView('rose-chart', () => t('views.rose.name'), 'aperture', RoseChartView),
  standardView(
    'pictorial-bar-chart',
    () => t('views.pictorial_bar.name'),
    'image',
    PictorialBarChartView,
  ),
  standardView(
    'stacked-bar-chart',
    () => t('views.stacked_bar.name'),
    'bar-chart-2',
    StackedBarChartView,
  ),
  standardView('combo-chart', () => t('views.combo.name'), 'layers', ComboChartView),
  standardView('area-chart', () => t('views.area.name'), 'mountain', AreaChartView),
  standardView('scatter-chart', () => t('views.scatter.name'), 'crosshair', ScatterChartView),
  standardView(
    'effect-scatter-chart',
    () => t('views.effect_scatter.name'),
    'disc',
    EffectScatterChartView,
  ),
  standardView('bubble-chart', () => t('views.bubble.name'), 'circle', BubbleChartView),
  standardView('radar-chart', () => t('views.radar.name'), 'hexagon', RadarChartView),
  standardView('funnel-chart', () => t('views.funnel.name'), 'filter', FunnelChartView),
  standardView('gauge-chart', () => t('views.gauge.name'), 'gauge', GaugeChartView),
  standardView('heatmap-chart', () => t('views.heatmap.name'), 'grid', HeatmapChartView),
  standardView(
    'candlestick-chart',
    () => t('views.candlestick.name'),
    'bar-chart',
    CandlestickChartView,
  ),
  standardView('boxplot-chart', () => t('views.boxplot.name'), 'box-select', BoxplotChartView),
  standardView('sankey-chart', () => t('views.sankey.name'), 'git-merge', SankeyChartView),
  standardView('graph-chart', () => t('views.graph.name'), 'git-fork', GraphChartView),
  standardView('sunburst-chart', () => t('views.sunburst.name'), 'disc', SunburstChartView),
  standardView('tree-chart', () => t('views.tree.name'), 'network', TreeChartView),
  standardView(
    'theme-river-chart',
    () => t('views.theme_river.name'),
    'waves',
    ThemeRiverChartView,
  ),
  standardView('calendar-chart', () => t('views.calendar.name'), 'calendar', CalendarChartView),
  standardView(
    'parallel-chart',
    () => t('views.parallel.name'),
    'sliders-horizontal',
    ParallelChartView,
  ),
  standardView('gantt-chart', () => t('views.gantt.name'), 'calendar-clock', GanttChartView),
  standardView(
    'waterfall-chart',
    () => t('views.waterfall.name'),
    'trending-down',
    WaterfallChartView,
  ),
  standardView(
    'pareto-chart',
    () => t('views.pareto.name'),
    'bar-chart-horizontal',
    ParetoChartView,
  ),
  standardView(
    'histogram-chart',
    () => t('views.histogram.name'),
    'bar-chart-big',
    HistogramChartView,
  ),
  standardView('bullet-chart', () => t('views.bullet.name'), 'crosshair', BulletChartView),
  standardView(
    'radial-bar-chart',
    () => t('views.radial_bar.name'),
    'circle-dot',
    RadialBarChartView,
  ),
  standardView(
    'polar-line-chart',
    () => t('views.polar_line.name'),
    'activity',
    PolarLineChartView,
  ),
  standardView(
    'polar-scatter-chart',
    () => t('views.polar_scatter.name'),
    'crosshair',
    PolarScatterChartView,
  ),
  standardView('map-chart', () => t('views.map.name'), 'map', MapChartView),
  standardView('word-cloud-chart', () => t('views.word_cloud.name'), 'cloud', WordCloudChartView),
  {
    type: 'echarts',
    getName: () => t('views.echarts.name'),
    icon: 'code-2',
    factory: (controller, containerEl, plugin) => new EChartsView(controller, containerEl, plugin),
    options: plugin => EChartsView.getViewOptions(plugin),
  },
]

export function registerChartViews(plugin: BarePlugin): void {
  CHART_VIEW_REGISTRATIONS.forEach(registration => {
    plugin.registerBasesView(registration.type, {
      name: registration.getName(),
      icon: registration.icon,
      factory: (controller, containerEl) => registration.factory(controller, containerEl, plugin),
      options: () => registration.options(plugin),
    })
  })
}
