import type {
  BasesOptions,
} from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class SunburstChartView extends BaseChartView {
  readonly type = 'sunburst-chart'
  getViewType(): string {
    return 'sunburst-chart'
  }

  getDisplayText(): string {
    return 'Sunburst'
  }

  getIcon(): string {
    return 'disc'
  }

  static getViewOptions(): BasesOptions[] {
    return [
      {
        displayName: t('views.sunburst.path_prop'),
        type: 'property',
        key: BaseChartView.X_AXIS_PROP_KEY,
        placeholder: t('views.sunburst.path_placeholder'),
      },
      {
        displayName: t('views.sunburst.value_prop'),
        type: 'property',
        key: BaseChartView.VALUE_PROP_KEY,
        placeholder: t('views.sunburst.value_placeholder'),
      },
      ...BaseChartView.getCommonViewOptions().filter((o) => {
        const key = (o as { key?: string }).key
        return key !== BaseChartView.X_AXIS_PROP_KEY && key !== BaseChartView.Y_AXIS_PROP_KEY && key !== BaseChartView.SERIES_PROP_KEY
      }),
    ]
  }

  protected getChartOption(data: BasesData): EChartsOption | null {
    const pathProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY) as string
    const valueProp = this.config.get(BaseChartView.VALUE_PROP_KEY) as string

    if (!pathProp) {
      return null
    }

    return transformDataToChartOption(
      data,
      pathProp,
      '',
      'sunburst',
      {
        ...this.getCommonTransformerOptions(),
        valueProp: valueProp,
      },
    )
  }
}
