import type { ViewOption } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'

export class RoseChartView extends BaseChartView {
  readonly type = 'rose-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    // Rose chart uses X-Axis as Category and Y-Axis as Value, similar to Pie
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)

    if (typeof xProp !== 'string' || typeof yProp !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'rose',
      {
        ...this.getCommonTransformerOptions(),
      },
    )
  }

  static getViewOptions(): ViewOption[] {
    return BaseChartView.getCommonViewOptions()
  }
}
