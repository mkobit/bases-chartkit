import type {
  BasesOptions,
} from 'obsidian'
import type { EChartsOption } from 'echarts'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class BoxplotChartView extends BaseChartView {
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY) as string
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY) as string
    const seriesProp = this.config.get(BaseChartView.SERIES_PROP_KEY) as string

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
      {
        displayName: t('views.boxplot.x_axis_prop'),
        type: 'property',
        key: BaseChartView.X_AXIS_PROP_KEY,
        placeholder: t('views.common.x_axis_prop_placeholder'),
      },
      {
        displayName: t('views.boxplot.y_axis_prop'),
        type: 'property',
        key: BaseChartView.Y_AXIS_PROP_KEY,
        placeholder: t('views.common.y_axis_prop_placeholder'),
      },
      {
        displayName: t('views.common.series_prop'),
        type: 'property',
        key: BaseChartView.SERIES_PROP_KEY,
        placeholder: t('views.common.series_prop_placeholder'),
      },
      {
        displayName: t('views.common.show_legend'),
        type: 'toggle',
        key: BaseChartView.LEGEND_KEY,
      },
    ]
  }

  public readonly type = 'boxplot-chart'
}
