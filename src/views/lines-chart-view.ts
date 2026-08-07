import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class LinesChartView extends BaseChartView {
  readonly type = 'lines-chart'

  static readonly END_X_PROP_KEY = 'end_x_prop'
  static readonly END_Y_PROP_KEY = 'end_y_prop'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)
    const x2Prop = this.config.get(LinesChartView.END_X_PROP_KEY)
    const y2Prop = this.config.get(LinesChartView.END_Y_PROP_KEY)
    const seriesProp = this.config.get(BaseChartView.SERIES_PROP_KEY)

    if (typeof xProp !== 'string' || typeof yProp !== 'string' || typeof x2Prop !== 'string' || typeof y2Prop !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'lines',
      {
        ...this.getCommonTransformerOptions(),
        x2Prop,
        y2Prop,
        seriesProp: typeof seriesProp === 'string' ? seriesProp : undefined,
      },
    )
  }

  static getViewOptions(): BasesOptions[] {
    return [
      {
        key: BaseChartView.X_AXIS_PROP_KEY,
        type: 'property',
        displayName: t('views.lines.start_x_prop'),
        placeholder: t('views.lines.start_x_prop_placeholder'),
      },
      {
        key: BaseChartView.Y_AXIS_PROP_KEY,
        type: 'property',
        displayName: t('views.lines.start_y_prop'),
        placeholder: t('views.lines.start_y_prop_placeholder'),
      },
      {
        key: LinesChartView.END_X_PROP_KEY,
        type: 'property',
        displayName: t('views.lines.end_x_prop'),
        placeholder: t('views.lines.end_x_prop_placeholder'),
      },
      {
        key: LinesChartView.END_Y_PROP_KEY,
        type: 'property',
        displayName: t('views.lines.end_y_prop'),
        placeholder: t('views.lines.end_y_prop_placeholder'),
      },
      {
        key: BaseChartView.SERIES_PROP_KEY,
        type: 'property',
        displayName: t('views.lines.series_prop'),
        placeholder: t('views.lines.series_prop_placeholder'),
      },
      ...BaseChartView.getCommonViewOptions().filter((opt) => {
        if ('key' in opt && typeof opt.key === 'string') {
          return opt.key !== BaseChartView.X_AXIS_PROP_KEY
            && opt.key !== BaseChartView.Y_AXIS_PROP_KEY
            && opt.key !== BaseChartView.SERIES_PROP_KEY
        }
        return true
      }),
    ]
  }
}
