import type { ViewOption } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class AreaChartView extends BaseChartView {
  readonly type = 'area-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)
    const seriesProp = this.config.get(BaseChartView.SERIES_PROP_KEY)

    const smooth = this.getBooleanOption('smooth')
    const showSymbol = this.getBooleanOption('showSymbol')
    const areaStyle = true

    if (typeof xProp !== 'string' || typeof yProp !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'line',
      {
        ...this.getCommonTransformerOptions(),
        smooth,
        showSymbol,
        areaStyle,
        seriesProp: typeof seriesProp === 'string' ? seriesProp : undefined,
      },
    )
  }

  static getViewOptions(): ViewOption[] {
    return [
      ...BaseChartView.getCommonViewOptions(),
      ...BaseChartView.getAxisViewOptions(),
      {
        displayName: t('views.area.smooth'),
        type: 'toggle',
        key: 'smooth',
      },
      {
        displayName: t('views.area.show_symbol'),
        type: 'toggle',
        key: 'showSymbol',
      },
    ]
  }
}
