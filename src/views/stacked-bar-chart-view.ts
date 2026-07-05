import type { ViewOption } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'

export class StackedBarChartView extends BaseChartView {
  readonly type = 'stacked-bar-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)
    const seriesProp = this.config.get(BaseChartView.SERIES_PROP_KEY)

    if (typeof xProp !== 'string' || typeof yProp !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'bar',
      {
        ...this.getCommonTransformerOptions(),
        stack: true,
        seriesProp: typeof seriesProp === 'string' ? seriesProp : undefined,
      },
    )
  }

  static getViewOptions(): ViewOption[] {
    return [...BaseChartView.getCommonViewOptions(),
      ...BaseChartView.getAxisViewOptions()]
  }
}
