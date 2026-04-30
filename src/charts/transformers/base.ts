export type ChartType = 'bar' | 'line' | 'lines' | 'pie' | 'scatter' | 'effectScatter' | 'bubble' | 'radar' | 'funnel' | 'gauge' | 'heatmap' | 'candlestick' | 'treemap' | 'boxplot' | 'sankey' | 'graph' | 'sunburst' | 'tree' | 'themeRiver' | 'calendar' | 'parallel' | 'rose' | 'pictorialBar' | 'gantt' | 'waterfall' | 'pareto' | 'histogram' | 'bullet' | 'radialBar' | 'polarLine' | 'polarBar' | 'polarScatter' | 'map' | 'wordCloud'

export type BasesData = ReadonlyArray<Readonly<Record<string, unknown>>>

export interface VisualMapOptions {
  readonly visualMapMin?: number
  readonly visualMapMax?: number
  readonly visualMapColor?: readonly string[]
  readonly visualMapOrient?: 'horizontal' | 'vertical'
  readonly visualMapType?: 'continuous' | 'piecewise'
  readonly visualMapLeft?: string | number
  readonly visualMapTop?: string | number
}

export interface BaseTransformerOptions extends VisualMapOptions {
  readonly legend?: boolean
  readonly legendPosition?: 'top' | 'bottom' | 'left' | 'right'
  readonly legendOrient?: 'horizontal' | 'vertical'
  readonly xAxisLabel?: string
  readonly yAxisLabel?: string
  readonly xAxisLabelRotate?: number
  readonly flipAxis?: boolean
  readonly isMobile?: boolean
  readonly containerWidth?: number
  readonly upColor?: string
  readonly downColor?: string
}
