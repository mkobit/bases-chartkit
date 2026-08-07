import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import type { BasesData } from '../charts/transformers/base'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import { t } from '../lang/text'

export class ParetoChartView extends BaseChartView {
  type = 'pareto-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY) as string
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY) as string

    if (!xProp || !yProp) {
      return null
    }

    const options = this.getCommonTransformerOptions()

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'pareto',
      options,
    )
  }

  static getViewOptions(): BasesOptions[] {
    const common = BaseChartView.getCommonViewOptions()

    // Remove seriesProp as Pareto doesn't support grouping by series
    const options = common.filter(o => 'key' in o && o.key !== BaseChartView.SERIES_PROP_KEY)

    // Customize display names
    const xOption = options.find(o => 'key' in o && o.key === BaseChartView.X_AXIS_PROP_KEY)
    if (xOption) {
      xOption.displayName = t('views.pareto.category_prop')
    }

    const yOption = options.find(o => 'key' in o && o.key === BaseChartView.Y_AXIS_PROP_KEY)
    if (yOption) {
      yOption.displayName = t('views.pareto.value_prop')
    }

    return [
      ...options,
      ...BaseChartView.getAxisViewOptions(),
    ]
  }
}
