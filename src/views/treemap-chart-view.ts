import type {
  ViewOption,
} from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class TreemapChartView extends BaseChartView {
  readonly type = 'treemap-chart'
  getViewType(): string {
    return 'treemap-chart'
  }

  getDisplayText(): string {
    return 'Treemap'
  }

  getIcon(): string {
    return 'layout-grid' // Use an icon that looks like a treemap
  }

  static getViewOptions(): ViewOption[] {
    return [
      {
        displayName: t('views.treemap.name_prop'),
        type: 'property',
        key: BaseChartView.X_AXIS_PROP_KEY, // Map to Name
        placeholder: t('views.treemap.name_prop_placeholder'),
      },
      {
        displayName: t('views.treemap.value_prop'),
        type: 'property',
        key: BaseChartView.VALUE_PROP_KEY,
        placeholder: t('views.treemap.value_prop_placeholder'),
      },
    ]
  }

  protected getChartOption(data: BasesData): EChartsOption | null {
    const nameProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY) as string
    const valueProp = this.config.get(BaseChartView.VALUE_PROP_KEY) as string

    if (!nameProp || !valueProp) {
      return null
    }

    return transformDataToChartOption(
      data,
      nameProp,
      valueProp,
      'treemap',
      {},
    )
  }
}
