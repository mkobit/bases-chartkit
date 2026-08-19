import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class HeatmapChartView extends BaseChartView {
  readonly type = 'heatmap-chart'
  static getViewOptions(): BasesOptions[] {
    return [
      {
        displayName: t('views.common.x_axis_prop'),
        type: 'property',
        key: BaseChartView.X_AXIS_PROP_KEY,
        placeholder: t('views.heatmap.x_axis_placeholder'),
      },
      {
        displayName: t('views.common.y_axis_prop'),
        type: 'property',
        key: BaseChartView.Y_AXIS_PROP_KEY,
        placeholder: t('views.heatmap.y_axis_placeholder'),
      },
      {
        displayName: t('views.heatmap.value_prop'),
        type: 'property',
        key: BaseChartView.VALUE_PROP_KEY,
        placeholder: t('views.heatmap.value_prop_placeholder'),
      },
      ...BaseChartView.getAxisViewOptions().filter(opt => opt.key !== BaseChartView.FLIP_AXIS_KEY),
      ...BaseChartView.getVisualMapViewOptions(),
    ]
  }

  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)
    const valueProp = this.config.get(BaseChartView.VALUE_PROP_KEY)

    if (typeof xProp !== 'string' || typeof yProp !== 'string' || typeof valueProp !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'heatmap',
      {
        ...this.getCommonTransformerOptions(),
        valueProp: valueProp,
        valueLabel: this.getPropDisplayName(BaseChartView.VALUE_PROP_KEY),
        ...this.getVisualMapTransformerOptions(),
      },
    )
  }
}
