import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class LineChartView extends BaseChartView {
  readonly type = 'line-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.getStringOption(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.getStringOption(BaseChartView.Y_AXIS_PROP_KEY)
    const seriesProp = this.getStringOption(BaseChartView.SERIES_PROP_KEY)

    // Get line specific options safely
    const smooth = this.getBooleanOption('smooth')
    const showSymbol = this.getBooleanOption('showSymbol')
    const areaStyle = this.getBooleanOption('areaStyle')

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
        seriesProp,
      },
    )
  }

  static getViewOptions(): BasesOptions[] {
    return [
      ...BaseChartView.getCommonViewOptions(),
      ...BaseChartView.getAxisViewOptions(),
      {
        displayName: t('views.line.smooth'),
        type: 'toggle',
        key: 'smooth',
      },
      {
        displayName: t('views.line.show_symbol'),
        type: 'toggle',
        key: 'showSymbol',
      },
      {
        displayName: t('views.line.area_style'),
        type: 'toggle',
        key: 'areaStyle',
      },
    ]
  }
}
