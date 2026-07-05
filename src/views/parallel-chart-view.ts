import type { ViewOption } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { ParallelTransformerOptions } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class ParallelChartView extends BaseChartView {
  readonly type = 'parallel'

  static getViewOptions(): ViewOption[] {
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
      ...BaseChartView.getCommonViewOptions(),
    ]
  }

  getChartOption(data: BasesData): EChartsOption {
    const xProp = this.config.get('xProp') as string
    const seriesProp = this.config.get('seriesProp') as string

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
