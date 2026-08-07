import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'

export class PieChartView extends BaseChartView {
  readonly type = 'pie-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    // For Pie chart, X-Axis prop serves as "Name" (Category) and Y-Axis prop as "Value"
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)

    if (typeof xProp !== 'string' || typeof yProp !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'pie',
      {
        ...this.getCommonTransformerOptions(),
      },
    )
  }

  static getViewOptions(): BasesOptions[] {
    // Pie charts don't necessarily need 'Series Property' in the same way stacked bars do,
    // but we can reuse common options.
    // Actually, usually Pie chart is Name vs Value.
    return BaseChartView.getCommonViewOptions()
  }
}
