import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { ParallelTransformerOptions } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class ParallelChartView extends BaseChartView {
  public static readonly SMOOTH_KEY = 'smooth'
  public static readonly LAYOUT_KEY = 'layout'
  public static readonly LINE_WIDTH_KEY = 'lineWidth'
  public static readonly LINE_OPACITY_KEY = 'lineOpacity'

  readonly type = 'parallel'

  static getViewOptions(): BasesOptions[] {
    return [
      {
        displayName: t('views.parallel.dimensions'),
        key: 'xProp', // repurpose xProp for dimensions list
        type: 'text',
        placeholder: t('views.parallel.dimensions_placeholder'),
      },
      {
        displayName: t('views.parallel.series_prop'),
        key: 'seriesProp',
        type: 'property',
        placeholder: t('views.parallel.series_placeholder'),
      },
      {
        displayName: t('views.line.smooth'),
        key: ParallelChartView.SMOOTH_KEY,
        type: 'toggle',
      },
      ...BaseChartView.getCommonViewOptions(),
    ]
  }

  getChartOption(data: BasesData): EChartsOption {
    // '' is a safe fallback for the required xProp positional slot below --
    // dims then parses to an empty list, matching the "no dimensions" branch
    // the transformer already handles for a blank config value.
    const xProp = this.getStringOption('xProp') ?? ''
    const seriesProp = this.getStringOption('seriesProp')
    const smooth = this.getBooleanOption(ParallelChartView.SMOOTH_KEY)
    const layout = this.getLiteralOption(ParallelChartView.LAYOUT_KEY, ['horizontal', 'vertical'] as const)
    const theme = this.getStringOption(BaseChartView.THEME_KEY)

    const lineWidthRaw = this.config.get(ParallelChartView.LINE_WIDTH_KEY)
    const lineWidth = typeof lineWidthRaw === 'number'
      ? lineWidthRaw
      : (typeof lineWidthRaw === 'string' && !Number.isNaN(Number(lineWidthRaw)) ? Number(lineWidthRaw) : undefined)

    const lineOpacityRaw = this.config.get(ParallelChartView.LINE_OPACITY_KEY)
    const lineOpacity = typeof lineOpacityRaw === 'number'
      ? lineOpacityRaw
      : (typeof lineOpacityRaw === 'string' && !Number.isNaN(Number(lineOpacityRaw)) ? Number(lineOpacityRaw) : undefined)

    const dims = typeof xProp === 'string'
      ? xProp.split(',').map(s => s.trim()).filter(s => s.length > 0)
      : []
    const dimensionLabels = Object.fromEntries(
      dims.map(dim => [dim, this.getDisplayNameForPropertyPath(dim)]),
    )

    const options: ParallelTransformerOptions = {
      ...this.getCommonTransformerOptions(),
      seriesProp,
      dimensionLabels,
      smooth,
      layout,
      lineWidth,
      lineOpacity,
      theme,
    }

    return transformDataToChartOption(
      data,
      xProp,
      '',
      'parallel',
      options,
    )
  }
}
