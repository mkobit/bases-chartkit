import { Plugin } from 'obsidian'
import type { BarePluginSettings } from './settings'
import { DEFAULT_SETTINGS, SettingTab } from './settings'
import { BarChartView } from './views/bar-chart-view'
import { LineChartView } from './views/line-chart-view'
import { LinesChartView } from './views/lines-chart-view'
import { PieChartView } from './views/pie-chart-view'
import { StackedBarChartView } from './views/stacked-bar-chart-view'
import { AreaChartView } from './views/area-chart-view'
import { ScatterChartView } from './views/scatter-chart-view'
import { EffectScatterChartView } from './views/effect-scatter-chart-view'
import { BubbleChartView } from './views/bubble-chart-view'
import { RadarChartView } from './views/radar-chart-view'
import { FunnelChartView } from './views/funnel-chart-view'
import { GaugeChartView } from './views/gauge-chart-view'
import { HeatmapChartView } from './views/heatmap-chart-view'
import { CandlestickChartView } from './views/candlestick-chart-view'
import { TreemapChartView } from './views/treemap-chart-view'
import { BoxplotChartView } from './views/boxplot-chart-view'
import { SankeyChartView } from './views/sankey-chart-view'
import { GraphChartView } from './views/graph-chart-view'
import { SunburstChartView } from './views/sunburst-chart-view'
import { TreeChartView } from './views/tree-chart-view'
import { ThemeRiverChartView } from './views/theme-river-chart-view'
import { CalendarChartView } from './views/calendar-chart-view'
import { ParallelChartView } from './views/parallel-chart-view'
import { RoseChartView } from './views/rose-chart-view'
import { PictorialBarChartView } from './views/pictorial-bar-chart-view'
import { GanttChartView } from './views/gantt-chart-view'
import { WaterfallChartView } from './views/waterfall-chart-view'
import { ParetoChartView } from './views/pareto-chart-view'
import { HistogramChartView } from './views/histogram-chart-view'
import { BulletChartView } from './views/bullet-chart-view'
import { RadialBarChartView } from './views/radial-bar-chart-view'
import { PolarLineChartView } from './views/polar-line-chart-view'
import { PolarBarChartView } from './views/polar-bar-chart-view'
import { PolarScatterChartView } from './views/polar-scatter-chart-view'
import { MapChartView } from './views/map-chart-view'
import { WordCloudChartView } from './views/word-cloud-chart-view'
import { initializeI18n } from './lang/i18n'
import { t } from './lang/text'
import * as echarts from 'echarts'
import { parseTheme } from './theme-validation'

export default class BarePlugin extends Plugin {
  public settings: BarePluginSettings = DEFAULT_SETTINGS

  async onload() {
    await this.loadSettings()
    this.applyTheme()
    await initializeI18n()

    this.registerBasesView(
      'treemap-chart',
      {
        name: t('views.treemap.name'),
        icon: 'layout-grid',
        factory: (controller, containerEl) => new TreemapChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => TreemapChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'bar-chart',
      {
        name: t('views.bar.name'),
        icon: 'bar-chart',
        factory: (controller, containerEl) => new BarChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => BarChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'line-chart',
      {
        name: t('views.line.name'),
        icon: 'activity',
        factory: (controller, containerEl) => new LineChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => LineChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'lines-chart',
      {
        name: t('views.lines.name'),
        icon: 'route', // Using route icon if available, or similar
        factory: (controller, containerEl) => new LinesChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => LinesChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'pie-chart',
      {
        name: t('views.pie.name'),
        icon: 'pie-chart',
        factory: (controller, containerEl) => new PieChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => PieChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'rose-chart',
      {
        name: t('views.rose.name'),
        icon: 'aperture',
        factory: (controller, containerEl) => new RoseChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => RoseChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'pictorial-bar-chart',
      {
        name: t('views.pictorial_bar.name'),
        icon: 'image',
        factory: (controller, containerEl) => new PictorialBarChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => PictorialBarChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'stacked-bar-chart',
      {
        name: t('views.stacked_bar.name'),
        icon: 'bar-chart-2', // Using a variation of bar chart icon
        factory: (controller, containerEl) => new StackedBarChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => StackedBarChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'area-chart',
      {
        name: t('views.area.name'),
        icon: 'mountain', // Often used for area charts or similar
        factory: (controller, containerEl) => new AreaChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => AreaChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'scatter-chart',
      {
        name: t('views.scatter.name'),
        icon: 'crosshair', // or dot-network
        factory: (controller, containerEl) => new ScatterChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => ScatterChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'effect-scatter-chart',
      {
        name: t('views.effect_scatter.name'),
        icon: 'disc', // Similar to scatter but with effects
        factory: (controller, containerEl) => new EffectScatterChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => EffectScatterChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'bubble-chart',
      {
        name: t('views.bubble.name'),
        icon: 'circle',
        factory: (controller, containerEl) => new BubbleChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => BubbleChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'radar-chart',
      {
        name: t('views.radar.name'),
        icon: 'hexagon',
        factory: (controller, containerEl) => new RadarChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => RadarChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'funnel-chart',
      {
        name: t('views.funnel.name'),
        icon: 'filter',
        factory: (controller, containerEl) => new FunnelChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => FunnelChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'gauge-chart',
      {
        name: t('views.gauge.name'),
        icon: 'gauge',
        factory: (controller, containerEl) => new GaugeChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => GaugeChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'heatmap-chart',
      {
        name: t('views.heatmap.name'),
        icon: 'grid',
        factory: (controller, containerEl) => new HeatmapChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => HeatmapChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'candlestick-chart',
      {
        name: t('views.candlestick.name'),
        icon: 'bar-chart', // Using bar-chart as placeholder or we could find a better one
        factory: (controller, containerEl) => new CandlestickChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => CandlestickChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'boxplot-chart',
      {
        name: t('views.boxplot.name'),
        icon: 'box-select', // Using box-select from lucide
        factory: (controller, containerEl) => new BoxplotChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => BoxplotChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'sankey-chart',
      {
        name: t('views.sankey.name'),
        icon: 'git-merge', // Using git-merge as it represents flow/splitting
        factory: (controller, containerEl) => new SankeyChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => SankeyChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'graph-chart',
      {
        name: t('views.graph.name'),
        icon: 'git-fork', // Using git-fork for graph/network
        factory: (controller, containerEl) => new GraphChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => GraphChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'sunburst-chart',
      {
        name: t('views.sunburst.name'),
        icon: 'disc',
        factory: (controller, containerEl) => new SunburstChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => SunburstChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'tree-chart',
      {
        name: t('views.tree.name'),
        icon: 'network',
        factory: (controller, containerEl) => new TreeChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => TreeChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'theme-river-chart',
      {
        name: t('views.theme_river.name'),
        icon: 'waves',
        factory: (controller, containerEl) => new ThemeRiverChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => ThemeRiverChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'calendar-chart',
      {
        name: t('views.calendar.name'),
        icon: 'calendar',
        factory: (controller, containerEl) => new CalendarChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => CalendarChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'parallel-chart',
      {
        name: t('views.parallel.name'),
        icon: 'sliders-horizontal',
        factory: (controller, containerEl) => new ParallelChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => ParallelChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'gantt-chart',
      {
        name: t('views.gantt.name'),
        icon: 'calendar-clock',
        factory: (controller, containerEl) => new GanttChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => GanttChartView.getViewOptions(this),
      },
    )

    this.registerBasesView(
      'waterfall-chart',
      {
        name: t('views.waterfall.name'),
        icon: 'trending-down',
        factory: (controller, containerEl) => new WaterfallChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => WaterfallChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'pareto-chart',
      {
        name: t('views.pareto.name'),
        icon: 'bar-chart-horizontal',
        factory: (controller, containerEl) => new ParetoChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => ParetoChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'histogram-chart',
      {
        name: t('views.histogram.name'),
        icon: 'bar-chart-big',
        factory: (controller, containerEl) => new HistogramChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => HistogramChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'bullet-chart',
      {
        name: t('views.bullet.name'),
        icon: 'crosshair',
        factory: (controller, containerEl) => new BulletChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => BulletChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'radial-bar-chart',
      {
        name: t('views.radial_bar.name'),
        icon: 'circle-dot',
        factory: (controller, containerEl) => new RadialBarChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => RadialBarChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'polar-line-chart',
      {
        name: t('views.polar_line.name'),
        icon: 'activity',
        factory: (controller, containerEl) => new PolarLineChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => PolarLineChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'polar-bar-chart',
      {
        name: t('views.polar_bar.name'),
        icon: 'bar-chart-2',
        factory: (controller, containerEl) => new PolarBarChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => PolarBarChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'polar-scatter-chart',
      {
        name: t('views.polar_scatter.name'),
        icon: 'crosshair',
        factory: (controller, containerEl) => new PolarScatterChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => PolarScatterChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'map-chart',
      {
        name: t('views.map.name'),
        icon: 'map',
        factory: (controller, containerEl) => new MapChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => MapChartView.getViewOptions(),
      },
    )

    this.registerBasesView(
      'word-cloud-chart',
      {
        name: t('views.word_cloud.name'),
        icon: 'cloud',
        factory: (controller, containerEl) => new WordCloudChartView(
          controller,
          containerEl,
          this,
        ),
        options: () => WordCloudChartView.getViewOptions(),
      },
    )

    this.addSettingTab(new SettingTab(
      this.app,
      this,
    ))
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData() as Partial<BarePluginSettings>,
    )
  }

  async saveSettings() {
    await this.saveData(this.settings)
    this.applyTheme()
  }

  applyTheme() {
    this.settings.customThemes.forEach((customTheme) => {
      const theme = parseTheme(customTheme.json)
      if (theme) {
        echarts.registerTheme(customTheme.name, theme)
      }
      else {
        /* eslint-disable-next-line no-console */
        console.error(`Failed to parse custom ECharts theme: ${customTheme.name}`)
      }
    })
  }
}
