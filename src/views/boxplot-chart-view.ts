import type {
  BasesOptions,
} from 'obsidian'
import type { EChartsOption } from 'echarts'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { BasesData } from '../charts/transformers/base'

export class BoxplotChartView extends BaseChartView {
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.getStringOption(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.getStringOption(BaseChartView.Y_AXIS_PROP_KEY)
    const seriesProp = this.getStringOption(BaseChartView.SERIES_PROP_KEY)

    if (!xProp || !yProp) {
      return null
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'boxplot',
      {
        ...this.getCommonTransformerOptions(),
        seriesProp: seriesProp,
      },
    )
  }

  static getViewOptions(): BasesOptions[] {
    return [
      ...BaseChartView.getCommonViewOptions(),
    ]
  }

  public readonly type = 'boxplot-chart'
}
