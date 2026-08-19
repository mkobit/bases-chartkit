import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class BubbleChartView extends BaseChartView {
  readonly type = 'bubble-chart'
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
      'bubble',
      {
        ...this.getCommonTransformerOptions(),
        seriesProp: typeof seriesProp === 'string' ? seriesProp : undefined,
        sizeProp: typeof sizeProp === 'string' ? sizeProp : undefined,
        sizeLabel: this.getPropDisplayName(BaseChartView.SIZE_PROP_KEY),
      },
    )
  }

  static getViewOptions(): BasesOptions[] {
    return [
      ...BaseChartView.getCommonViewOptions(),
      ...BaseChartView.getAxisViewOptions().filter(opt => opt.key !== BaseChartView.FLIP_AXIS_KEY),
      {
        displayName: t('views.bubble.size_prop'),
        type: 'property',
        key: BaseChartView.SIZE_PROP_KEY,
        placeholder: t('views.bubble.size_prop_placeholder'),
      },
    ]
  }
}
