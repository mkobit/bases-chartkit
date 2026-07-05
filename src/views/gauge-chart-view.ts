import type { ViewOption } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

const AGGREGATIONS = ['sum', 'avg', 'min', 'max', 'last'] as const
type Aggregation = typeof AGGREGATIONS[number]

function isAggregation(value: unknown): value is Aggregation {
  return typeof value === 'string' && (AGGREGATIONS as readonly string[]).includes(value)
}

export class GaugeChartView extends BaseChartView {
  public static readonly AGGREGATION_KEY = 'aggregation'

  readonly type = 'gauge-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)
    // Cast BaseChartView to any to access new props
    const minVal = Number(this.config.get(BaseChartView.MIN_VALUE_KEY))
    const maxVal = Number(this.config.get(BaseChartView.MAX_VALUE_KEY))
    const aggregationRaw = this.config.get(GaugeChartView.AGGREGATION_KEY)

    if (typeof yProp !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      '',
      yProp,
      'gauge',
      {
        min: isNaN(minVal) ? 0 : minVal,
        max: isNaN(maxVal) ? 100 : maxVal,
        aggregation: isAggregation(aggregationRaw) ? aggregationRaw : 'sum',
        yAxisLabel: this.getPropDisplayName(BaseChartView.Y_AXIS_PROP_KEY) ?? yProp,
      },
    )
  }

  static getViewOptions(): ViewOption[] {
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
    ]
  }
}
