import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class ThemeRiverChartView extends BaseChartView {
  readonly type = 'theme-river-chart'
  getViewType(): string { return 'theme-river-chart' }

  getDisplayText(): string { return 'Theme river' }

  getIcon(): string { return 'waves' }

  static getViewOptions(): BasesOptions[] {
    return [
      {
        displayName: t('views.theme_river.date_prop'),
        type: 'property',
        key: BaseChartView.X_AXIS_PROP_KEY,
        placeholder: t('views.theme_river.date_placeholder'),
      },
      {
        displayName: t('views.theme_river.value_prop'),
        type: 'property',
        key: BaseChartView.VALUE_PROP_KEY,
        placeholder: t('views.theme_river.value_placeholder'),
      },
      {
        displayName: t('views.theme_river.theme_prop'),
        type: 'property',
        key: BaseChartView.SERIES_PROP_KEY,
        placeholder: t('views.theme_river.theme_placeholder'),
      },
      {
        displayName: t('views.common.show_legend'),
        type: 'toggle',
        key: BaseChartView.LEGEND_KEY,
      },
    ]
  }

  protected getChartOption(data: BasesData): EChartsOption | null {
    const dateProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY) as string
    const valueProp = this.config.get(BaseChartView.VALUE_PROP_KEY) as string
    const themeProp = this.config.get(BaseChartView.SERIES_PROP_KEY) as string

    if (!dateProp || !valueProp) {
      return null
    }

    return transformDataToChartOption(
      data,
      dateProp,
      '',
      'themeRiver',
      {
        ...this.getCommonTransformerOptions(),
        valueProp: valueProp,
        themeProp: themeProp, // Ensure this property is added to ChartTransformerOptions
      },
    )
  }
}
