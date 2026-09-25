import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'
import { isAggregation, parseColorBands } from '../charts/transformers/gauge'

export class GaugeChartView extends BaseChartView {
  public static readonly AGGREGATION_KEY = 'aggregation'
  public static readonly COLOR_BANDS_KEY = 'colorBands'

  readonly type = 'gauge-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)
    const minVal = Number(this.config.get(BaseChartView.MIN_VALUE_KEY))
    const maxVal = Number(this.config.get(BaseChartView.MAX_VALUE_KEY))
    const aggregationRaw = this.config.get(GaugeChartView.AGGREGATION_KEY)
    const colorBandsRaw = this.config.get(GaugeChartView.COLOR_BANDS_KEY)

    if (typeof yProp !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      '',
      yProp,
      'gauge',
      {
        ...this.getCommonTransformerOptions(),
        min: isNaN(minVal) ? 0 : minVal,
        max: isNaN(maxVal) ? 100 : maxVal,
        aggregation: isAggregation(aggregationRaw) ? aggregationRaw : 'sum',
        yAxisLabel: this.getPropDisplayName(BaseChartView.Y_AXIS_PROP_KEY) ?? yProp,
        colorBands: parseColorBands(colorBandsRaw),
      },
    )
  }

  static getViewOptions(): BasesOptions[] {
    return [
      {
        displayName: t('views.gauge.value_prop'),
        type: 'property',
        key: BaseChartView.Y_AXIS_PROP_KEY,
        placeholder: t('views.gauge.value_prop_placeholder'),
      },
      {
        displayName: t('views.gauge.aggregation'),
        type: 'dropdown',
        key: GaugeChartView.AGGREGATION_KEY,
        default: 'sum',
        options: {
          sum: t('views.gauge.aggregation_options.sum'),
          avg: t('views.gauge.aggregation_options.avg'),
          min: t('views.gauge.aggregation_options.min'),
          max: t('views.gauge.aggregation_options.max'),
          last: t('views.gauge.aggregation_options.last'),
        },
      },
      {
        displayName: t('views.gauge.min_value'),
        type: 'text',
        key: BaseChartView.MIN_VALUE_KEY,
        placeholder: '0',
      },
      {
        displayName: t('views.gauge.max_value'),
        type: 'text',
        key: BaseChartView.MAX_VALUE_KEY,
        placeholder: '100',
      },
      {
        displayName: t('views.gauge.color_bands'),
        type: 'text',
        key: GaugeChartView.COLOR_BANDS_KEY,
        placeholder: t('views.gauge.color_bands_placeholder'),
      },
      ...BaseChartView.getCommonViewOptions().filter((o) => {
        const key = o.key
        return key !== BaseChartView.X_AXIS_PROP_KEY && key !== BaseChartView.Y_AXIS_PROP_KEY && key !== BaseChartView.SERIES_PROP_KEY
      }),
    ]
  }
}
