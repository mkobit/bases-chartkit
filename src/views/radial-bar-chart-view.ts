import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class RadialBarChartView extends BaseChartView {
  readonly type = 'radial-bar-chart'
  static getViewOptions(): BasesOptions[] {
    return [
      {
        displayName: t('views.radial_bar.category_prop'),
        type: 'property',
        key: BaseChartView.X_AXIS_PROP_KEY,
        placeholder: t('views.radial_bar.category_placeholder'),
      },
      {
        displayName: t('views.radial_bar.value_prop'),
        type: 'property',
        key: BaseChartView.Y_AXIS_PROP_KEY,
        placeholder: t('views.radial_bar.value_placeholder'),
      },
      {
        displayName: t('views.common.series_prop'),
        type: 'property',
        key: BaseChartView.SERIES_PROP_KEY,
        placeholder: t('views.common.series_prop_placeholder'),
      },
      {
        displayName: t('views.polar.stack'),
        type: 'toggle',
        key: 'stack',
      },
      ...BaseChartView.getCommonViewOptions().filter(opt =>
      // Filter out options that are not applicable to Radial Bar or are already added
      // We keep Legend and Height
        (opt as { key?: string }).key === BaseChartView.LEGEND_KEY
        || (opt as { key?: string }).key === BaseChartView.HEIGHT_KEY
        || (opt as { key?: string }).key === BaseChartView.LEGEND_POSITION_KEY
        || (opt as { key?: string }).key === BaseChartView.LEGEND_ORIENT_KEY),
    ]
  }

  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)
    const seriesProp = this.config.get(BaseChartView.SERIES_PROP_KEY)
    const isStacked = this.getBooleanOption('stack') ?? false

    if (typeof xProp !== 'string' || typeof yProp !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'radialBar',
      {
        ...this.getCommonTransformerOptions(),
        seriesProp: typeof seriesProp === 'string' ? seriesProp : undefined,
        stack: isStacked,
      },
    )
  }
}
