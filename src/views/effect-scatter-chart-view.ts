import type { ViewOption } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class EffectScatterChartView extends BaseChartView {
  readonly type = 'effect-scatter-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)
    const seriesProp = this.config.get(BaseChartView.SERIES_PROP_KEY)
    const sizeProp = this.config.get(BaseChartView.SIZE_PROP_KEY)

    if (typeof xProp !== 'string' || typeof yProp !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'effectScatter',
      {
        ...this.getCommonTransformerOptions(),
        seriesProp: typeof seriesProp === 'string' ? seriesProp : undefined,
        sizeProp: typeof sizeProp === 'string' ? sizeProp : undefined,
        ...this.getVisualMapTransformerOptions(),
      },
    )
  }

  static getViewOptions(): ViewOption[] {
    return [
      ...BaseChartView.getCommonViewOptions(),
      ...BaseChartView.getAxisViewOptions().filter(opt => (opt as { key?: string }).key !== BaseChartView.FLIP_AXIS_KEY),
      {
        key: BaseChartView.SIZE_PROP_KEY,
        type: 'property',
        displayName: t('views.effect_scatter.size_prop'),
        placeholder: t('views.effect_scatter.size_prop_placeholder'),
      },
      ...BaseChartView.getVisualMapViewOptions(),
    ]
  }
}
