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
      ...BaseChartView.getVisualMapViewOptions(),
    ]
  }

  protected getChartOption(data: BasesData): EChartsOption | null {
    const dateProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY) as string
    const valueProp = this.config.get(BaseChartView.VALUE_PROP_KEY) as string

    if (!dateProp) {
      return null
    }

    return transformDataToChartOption(
      data,
      dateProp,
      '',
      'calendar',
      {
        valueProp: valueProp,
        ...this.getVisualMapTransformerOptions(),
      },
    )
  }
}
