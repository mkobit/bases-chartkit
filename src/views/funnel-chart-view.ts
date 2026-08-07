import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'

export class FunnelChartView extends BaseChartView {
  readonly type = 'funnel-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)

    if (typeof xProp !== 'string' || typeof yProp !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'funnel',
      {
        ...this.getCommonTransformerOptions(),
      },
    )
  }

  static getViewOptions(): BasesOptions[] {
    // Funnel doesn't really use "Series Prop" in the same way (usually single series),
    // but we can keep common options or strip Series Prop.
    // Let's strip Series Prop to avoid confusion as our transformer doesn't support multi-funnel yet.
    return BaseChartView.getCommonViewOptions().filter((o) => {
      if ('key' in o) {
        return o.key !== BaseChartView.SERIES_PROP_KEY
      }
      return true
    })
  }
}
