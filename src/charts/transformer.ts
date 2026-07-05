import type { EChartsOption } from 'echarts'

import type {
  PieTransformerOptions,
} from './transformers/pie'
import {
  createPieChartOption,
} from './transformers/pie'
import {
  createFunnelChartOption,
} from './transformers/funnel'
import type {
  RadarTransformerOptions,
} from './transformers/radar'
import {
  createRadarChartOption,
} from './transformers/radar'
import type {
  GaugeTransformerOptions,
} from './transformers/gauge'
import {
  createGaugeChartOption,
} from './transformers/gauge'
import type {
  ScatterTransformerOptions,
} from './transformers/scatter'
import {
  createScatterChartOption,
} from './transformers/scatter'
import type {
  EffectScatterTransformerOptions,
} from './transformers/effect-scatter'
import {
  createEffectScatterChartOption,
} from './transformers/effect-scatter'
import type {
  HeatmapTransformerOptions,
} from './transformers/heatmap'
import {
  createHeatmapChartOption,
} from './transformers/heatmap'
import type {
  CandlestickTransformerOptions,
} from './transformers/candlestick'
import {
  createCandlestickChartOption,
} from './transformers/candlestick'
import type {
  TreemapTransformerOptions,
} from './transformers/treemap'
import {
  createTreemapChartOption,
} from './transformers/treemap'
import type {
  BoxplotTransformerOptions,
} from './transformers/boxplot'
import {
  createBoxplotChartOption,
} from './transformers/boxplot'
import type {
  SankeyTransformerOptions,
} from './transformers/sankey'
import {
  createSankeyChartOption,
} from './transformers/sankey'
import type {
  GraphTransformerOptions,
} from './transformers/graph'
import {
  createGraphChartOption,
} from './transformers/graph'
import type {
  SunburstTransformerOptions } from './transformers/hierarchy'
import {
  createSunburstChartOption,
  createTreeChartOption,
} from './transformers/hierarchy'
import type {
  ThemeRiverTransformerOptions,
} from './transformers/theme-river'
import {
  createThemeRiverChartOption,
} from './transformers/theme-river'
import type {
  CalendarTransformerOptions,
} from './transformers/calendar'
import {
  createCalendarChartOption,
} from './transformers/calendar'
import type {
  ParallelTransformerOptions,
} from './transformers/parallel'
import {
  createParallelChartOption,
} from './transformers/parallel'
import type {
  CartesianTransformerOptions,
} from './transformers/cartesian'
import {
  createCartesianChartOption,
} from './transformers/cartesian'
import type {
  LinesTransformerOptions,
} from './transformers/lines'
import {
  createLinesChartOption,
} from './transformers/lines'
import type {
  PictorialBarTransformerOptions,
} from './transformers/pictorial-bar'
import {
  createPictorialBarChartOption,
} from './transformers/pictorial-bar'
import type {
  GanttTransformerOptions,
} from './transformers/gantt'
import {
  createGanttChartOption,
} from './transformers/gantt'
import {
  createWaterfallChartOption,
} from './transformers/waterfall'
import type {
  ParetoTransformerOptions,
} from './transformers/pareto'
import {
  createParetoChartOption,
} from './transformers/pareto'
import type {
  HistogramTransformerOptions,
} from './transformers/histogram'
import {
  createHistogramChartOption,
} from './transformers/histogram'
import type {
  BulletTransformerOptions,
} from './transformers/bullet'
import {
  createBulletChartOption,
} from './transformers/bullet'
import type {
  RadialBarTransformerOptions,
} from './transformers/radial-bar'
import {
  createRadialBarChartOption,
} from './transformers/radial-bar'
import type {
  PolarLineTransformerOptions,
} from './transformers/polar-line'
import {
  createPolarLineChartOption,
} from './transformers/polar-line'
import type {
  PolarScatterTransformerOptions,
} from './transformers/polar-scatter'
import {
  createPolarScatterChartOption,
} from './transformers/polar-scatter'
import type {
  MapTransformerOptions,
} from './transformers/map'
import {
  createMapChartOption,
} from './transformers/map'
import type {
  WordCloudTransformerOptions,
} from './transformers/extensions/word-cloud'
import {
  createWordCloudChartOption,
} from './transformers/extensions/word-cloud'
import type { ChartType, BasesData } from './transformers/base'

export type ChartTransformerOptions
  = | CartesianTransformerOptions
    | MapTransformerOptions
    | LinesTransformerOptions
    | PieTransformerOptions
    | ScatterTransformerOptions
    | EffectScatterTransformerOptions
    | RadarTransformerOptions
    | GaugeTransformerOptions
    | HeatmapTransformerOptions
    | CandlestickTransformerOptions
    | TreemapTransformerOptions
    | BoxplotTransformerOptions
    | SankeyTransformerOptions
    | GraphTransformerOptions
    | SunburstTransformerOptions
    | ThemeRiverTransformerOptions
    | CalendarTransformerOptions
    | ParallelTransformerOptions
    | PictorialBarTransformerOptions
    | GanttTransformerOptions
    | ParetoTransformerOptions
    | HistogramTransformerOptions
    | BulletTransformerOptions
    | RadialBarTransformerOptions
    | PolarLineTransformerOptions
    | PolarScatterTransformerOptions
    | WordCloudTransformerOptions

// Helper to cast options
function asOptions<T>(options: unknown): T {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
  return options as any
}

// Map of chart types to their transformer functions
const transformerMap: Readonly<Record<
  string,
  (data: BasesData, xProp: string, yProp: string, options: unknown) => EChartsOption
>> = {
  bar: (data, xProp, yProp, options): EChartsOption => createCartesianChartOption(
    data,
    xProp,
    yProp,
    'bar',
    asOptions(options),
  ),
  line: (data, xProp, yProp, options): EChartsOption => createCartesianChartOption(
    data,
    xProp,
    yProp,
    'line',
    asOptions(options),
  ),
  lines: (data, xProp, yProp, options): EChartsOption => createLinesChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  pie: (data, xProp, yProp, options): EChartsOption => createPieChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  rose: (data, xProp, yProp, options): EChartsOption => createPieChartOption(
    data,
    xProp,
    yProp,
    { ...(asOptions<PieTransformerOptions>(options)),
      roseType: 'area' },
  ),
  funnel: (data, xProp, yProp, options): EChartsOption => createFunnelChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  radar: (data, xProp, yProp, options): EChartsOption => createRadarChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  gauge: (data, _, yProp, options): EChartsOption => createGaugeChartOption(
    data,
    yProp,
    asOptions(options),
  ),
  bubble: (data, xProp, yProp, options): EChartsOption => createScatterChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  scatter: (data, xProp, yProp, options): EChartsOption => createScatterChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  effectScatter: (data, xProp, yProp, options): EChartsOption => createEffectScatterChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  heatmap: (data, xProp, yProp, options): EChartsOption => createHeatmapChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  candlestick: (data, xProp, _, options): EChartsOption => createCandlestickChartOption(
    data,
    xProp,
    asOptions(options),
  ),
  treemap: (data, xProp, yProp, options): EChartsOption => createTreemapChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  boxplot: (data, xProp, yProp, options): EChartsOption => createBoxplotChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  sankey: (data, xProp, yProp, options): EChartsOption => createSankeyChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  graph: (data, xProp, yProp, options): EChartsOption => createGraphChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  sunburst: (data, xProp, _, options): EChartsOption => createSunburstChartOption(
    data,
    xProp,
    asOptions(options),
  ),
  tree: (data, xProp, _, options): EChartsOption => createTreeChartOption(
    data,
    xProp,
    asOptions(options),
  ),
  themeRiver: (data, xProp, _, options): EChartsOption => createThemeRiverChartOption(
    data,
    xProp,
    asOptions(options),
  ),
  calendar: (data, xProp, _, options): EChartsOption => createCalendarChartOption(
    data,
    xProp,
    asOptions(options),
  ),
  parallel: (data, xProp, _, options): EChartsOption => createParallelChartOption(
    data,
    xProp,
    asOptions(options),
  ),
  pictorialBar: (data, xProp, yProp, options): EChartsOption => createPictorialBarChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  gantt: (data, _, __, options): EChartsOption => createGanttChartOption(
    data,
    asOptions(options),
  ),
  waterfall: (data, xProp, yProp, options): EChartsOption => createWaterfallChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  pareto: (data, xProp, yProp, options): EChartsOption => createParetoChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  histogram: (data, _, yProp, options): EChartsOption => createHistogramChartOption(
    data,
    yProp,
    asOptions(options),
  ),
  bullet: (data, xProp, yProp, options): EChartsOption => createBulletChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  radialBar: (data, xProp, yProp, options): EChartsOption => createRadialBarChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  polarLine: (data, xProp, yProp, options): EChartsOption => createPolarLineChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  polarScatter: (data, xProp, yProp, options): EChartsOption => createPolarScatterChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
  map: (data, _, yProp, options): EChartsOption => {
    const opts = asOptions<MapTransformerOptions>(options)
    return createMapChartOption(
      data,
      opts.mapName,
      opts,
    )
  },
  wordCloud: (data, xProp, yProp, options): EChartsOption => createWordCloudChartOption(
    data,
    xProp,
    yProp,
    asOptions(options),
  ),
}

/**
 * Transforms Bases data into an ECharts option object.
 */
export function transformDataToChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  chartType: ChartType = 'bar',
  options?: ChartTransformerOptions,
): EChartsOption {
  const transformer = transformerMap[chartType]

  return transformer
    ? transformer(
        data,
        xProp,
        yProp,
        options,
      )
    : createCartesianChartOption(
        data,
        xProp,
        yProp,
        'bar',
        asOptions(options),
      )
}

export { type ChartType, type BaseTransformerOptions, type BasesData } from './transformers/base'
export { type CartesianTransformerOptions } from './transformers/cartesian'
export { type LinesTransformerOptions } from './transformers/lines'
export { type PieTransformerOptions } from './transformers/pie'
export { type ScatterTransformerOptions } from './transformers/scatter'
export { type EffectScatterTransformerOptions } from './transformers/effect-scatter'
export { type RadarTransformerOptions } from './transformers/radar'
export { type GaugeTransformerOptions } from './transformers/gauge'
export { type HeatmapTransformerOptions } from './transformers/heatmap'
export { type CandlestickTransformerOptions } from './transformers/candlestick'
export { type TreemapTransformerOptions } from './transformers/treemap'
export { type BoxplotTransformerOptions } from './transformers/boxplot'
export { type SankeyTransformerOptions } from './transformers/sankey'
export { type GraphTransformerOptions } from './transformers/graph'
export { type SunburstTransformerOptions, type TreeTransformerOptions } from './transformers/hierarchy'
export { type ThemeRiverTransformerOptions } from './transformers/theme-river'
export { type CalendarTransformerOptions } from './transformers/calendar'
export { type ParallelTransformerOptions } from './transformers/parallel'
export { type GanttTransformerOptions } from './transformers/gantt'
export { type WaterfallTransformerOptions } from './transformers/waterfall'
export { type ParetoTransformerOptions } from './transformers/pareto'
export { type HistogramTransformerOptions } from './transformers/histogram'
export { type BulletTransformerOptions } from './transformers/bullet'
export { type RadialBarTransformerOptions } from './transformers/radial-bar'
export { type PolarLineTransformerOptions } from './transformers/polar-line'
export { type PolarScatterTransformerOptions } from './transformers/polar-scatter'
export { type MapTransformerOptions } from './transformers/map'
export { type WordCloudTransformerOptions } from './transformers/extensions/word-cloud'
