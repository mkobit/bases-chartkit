import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import type { ChartType } from '../charts/transformer'
import { transformDataToChartOption } from '../charts/transformer'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class GraphChartView extends BaseChartView {
  readonly type: ChartType = 'graph'

  static getViewOptions(): BasesOptions[] {
    return [
      ...BaseChartView.getCommonViewOptions(),
      {
        key: 'sourceProp',
        displayName: t('views.graph.source_prop'),
        type: 'property',
        placeholder: t('views.graph.source_placeholder'),
      },
      {
        key: 'targetProp',
        displayName: t('views.graph.target_prop'),
        type: 'property',
        placeholder: t('views.graph.target_placeholder'),
      },
      {
        key: 'valueProp',
        displayName: t('views.graph.value_prop'),
        type: 'property',
        placeholder: t('views.graph.value_placeholder'),
      },
      {
        key: 'categoryProp',
        displayName: t('views.graph.category_prop'),
        type: 'property',
        placeholder: t('views.graph.category_placeholder'),
      },
    ]
  }

  getChartOption(data: BasesData) {
    const sourceProp = this.getStringOption('sourceProp')
    const targetProp = this.getStringOption('targetProp')
    const valueProp = this.getStringOption('valueProp')
    const categoryProp = this.getStringOption('categoryProp')

    if (!sourceProp || !targetProp) {
      return {}
    }

    return transformDataToChartOption(
      data,
      sourceProp,
      targetProp,
      'graph',
      {
        ...this.getCommonTransformerOptions(),
        valueProp,
        categoryProp,
      },
    )
  }
}
