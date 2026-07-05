import type { ViewOption } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import type { EChartsOption } from 'echarts'
import { transformDataToChartOption } from '../charts/transformer'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class PolarBarChartView extends BaseChartView {
  readonly type = 'polar-bar-chart'

  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY) as string
    const yProp = this.config.get(BaseChartView.VALUE_PROP_KEY) as string
    const seriesProp = this.config.get(BaseChartView.SERIES_PROP_KEY) as string
    const isStacked = this.getBooleanOption('stack') ?? false

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'polarBar',
      {
        ...this.getCommonTransformerOptions(),
        yAxisLabel: this.getStringOption(BaseChartView.Y_AXIS_LABEL_KEY) ?? this.getPropDisplayName(BaseChartView.VALUE_PROP_KEY) ?? yProp,
        seriesProp,
        stack: isStacked,
      },
    )
  }

  static getViewOptions(): ViewOption[] {
    return [
      {
        key: BaseChartView.X_AXIS_PROP_KEY,
        displayName: t('views.polar.angle_prop'),
        type: 'property',
      },
      {
        key: BaseChartView.VALUE_PROP_KEY,
        displayName: t('views.polar.radius_prop'),
        type: 'property',
      },
      {
        key: BaseChartView.SERIES_PROP_KEY,
        displayName: t('views.polar.series_prop'),
        type: 'property',
      },
      {
        key: 'stack',
        displayName: t('views.polar.stack'),
        type: 'toggle',
      },
      ...BaseChartView.getCommonViewOptions(),
    ]
  }
}
