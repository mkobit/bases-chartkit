import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class CalendarChartView extends BaseChartView {
  readonly type = 'calendar-chart'

  static getViewOptions(): BasesOptions[] {
    return [
      {
        displayName: t('views.calendar.date_prop'),
        type: 'property',
        key: BaseChartView.X_AXIS_PROP_KEY,
        placeholder: t('views.calendar.date_placeholder'),
      },
      {
        displayName: t('views.calendar.value_prop'),
        type: 'property',
        key: BaseChartView.VALUE_PROP_KEY,
        placeholder: t('views.calendar.value_placeholder'),
      },
      ...BaseChartView.getCommonViewOptions().filter((o) => {
        const key = o.key
        return key !== BaseChartView.X_AXIS_PROP_KEY && key !== BaseChartView.Y_AXIS_PROP_KEY && key !== BaseChartView.SERIES_PROP_KEY
      }),
      ...BaseChartView.getVisualMapViewOptions(),
    ]
  }

  protected getChartOption(data: BasesData): EChartsOption | null {
    const dateProp = this.getStringOption(BaseChartView.X_AXIS_PROP_KEY)
    const valueProp = this.getStringOption(BaseChartView.VALUE_PROP_KEY)

    if (!dateProp) {
      return null
    }

    return transformDataToChartOption(
      data,
      dateProp,
      '',
      'calendar',
      {
        ...this.getCommonTransformerOptions(),
        valueProp: valueProp,
        ...this.getVisualMapTransformerOptions(),
      },
    )
  }
}
