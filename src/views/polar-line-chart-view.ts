import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import type { EChartsOption } from 'echarts'
import { transformDataToChartOption } from '../charts/transformer'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class PolarLineChartView extends BaseChartView {
  readonly type = 'polar-line-chart'

  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY) as string
    const yProp = this.config.get(BaseChartView.VALUE_PROP_KEY) as string
    const seriesProp = this.config.get(BaseChartView.SERIES_PROP_KEY) as string
    const isSmooth = this.getBooleanOption('smooth') ?? false
    const hasAreaStyle = this.getBooleanOption('areaStyle') ?? false
    const isStacked = this.getBooleanOption('stack') ?? false

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'polarLine',
      {
        ...this.getCommonTransformerOptions(),
        // getCommonTransformerOptions()'s yAxisLabel default resolves
        // Y_AXIS_PROP_KEY, but polar-line's radius value comes from
        // VALUE_PROP_KEY (there's no cartesian y-axis prop here) -- same
        // override bullet-chart-view.ts uses for the same reason.
        yAxisLabel: this.getStringOption(BaseChartView.Y_AXIS_LABEL_KEY) ?? this.getPropDisplayName(BaseChartView.VALUE_PROP_KEY) ?? yProp,
        seriesProp,
        smooth: isSmooth,
        areaStyle: hasAreaStyle,
        stack: isStacked,
      },
    )
  }

  static getViewOptions(): BasesOptions[] {
    return [
      {
        key: BaseChartView.X_AXIS_PROP_KEY,
        displayName: t('views.polar.angle_prop'),
        type: 'property',
      },
      {
        key: BaseChartView.VALUE_PROP_KEY,
        displayName: t('views.polar.radius_prop'),
        type: 'property',
      },
      {
        key: BaseChartView.SERIES_PROP_KEY,
        displayName: t('views.polar.series_prop'),
        type: 'property',
      },
      {
        key: 'smooth',
        displayName: t('views.polar.smooth'),
        type: 'toggle',
      },
      {
        key: 'areaStyle',
        displayName: t('views.polar.area_style'),
        type: 'toggle',
      },
      {
        key: 'stack',
        displayName: t('views.polar.stack'),
        type: 'toggle',
      },
      ...BaseChartView.getCommonViewOptions(),
    ]
  }
}
