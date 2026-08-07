import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class WaterfallChartView extends BaseChartView {
  type = 'waterfall-chart'

  static getViewOptions(): BasesOptions[] {
    // reuse common options but exclude seriesProp and rename X/Y
    const common = BaseChartView.getCommonViewOptions()

    // Remove seriesProp as waterfall currently doesn't support grouping by series
    const options = common.filter(o => 'key' in o && o.key !== BaseChartView.SERIES_PROP_KEY)

    // Customize display names
    const xOption = options.find(o => 'key' in o && o.key === BaseChartView.X_AXIS_PROP_KEY)
    if (xOption) {
      xOption.displayName = t('views.waterfall.category_prop')
    }

    const yOption = options.find(o => 'key' in o && o.key === BaseChartView.Y_AXIS_PROP_KEY)
    if (yOption) {
      yOption.displayName = t('views.waterfall.value_prop')
    }

    return [
      ...options,
      ...BaseChartView.getAxisViewOptions(),
    ]
  }

  getChartOption(data: BasesData) {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY) as string
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY) as string

    if (!xProp || !yProp) {
      return null
    }

    // We use 'waterfall' chart type
    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'waterfall',
      this.getCommonTransformerOptions(),
    )
  }
}
