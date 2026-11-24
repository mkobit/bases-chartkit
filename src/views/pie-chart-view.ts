import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'

export class PieChartView extends BaseChartView {
  public static readonly INNER_RADIUS_KEY = 'innerRadius'
  public static readonly OUTER_RADIUS_KEY = 'outerRadius'
  public static readonly DONUT_KEY = 'donut'
  public static readonly PAD_ANGLE_KEY = 'padAngle'
  public static readonly BORDER_RADIUS_KEY = 'borderRadius'

  readonly type = 'pie-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)

    if (typeof xProp !== 'string' || typeof yProp !== 'string') {
      return null
    }

    const innerRadius = this.getStringOrNumberOption(PieChartView.INNER_RADIUS_KEY)
    const outerRadius = this.getStringOrNumberOption(PieChartView.OUTER_RADIUS_KEY)
    const donut = this.getBooleanOption(PieChartView.DONUT_KEY)
    const padAngle = this.getNumberOption(PieChartView.PAD_ANGLE_KEY)
    const borderRadius = this.getNumberOption(PieChartView.BORDER_RADIUS_KEY)

    return transformDataToChartOption(data, xProp, yProp, 'pie', {
      ...this.getCommonTransformerOptions(),
      ...(innerRadius !== undefined ? { innerRadius } : {}),
      ...(outerRadius !== undefined ? { outerRadius } : {}),
      ...(donut !== undefined ? { donut } : {}),
      ...(padAngle !== undefined ? { padAngle } : {}),
      ...(borderRadius !== undefined ? { borderRadius } : {}),
    })
  }

  static getViewOptions(): BasesOptions[] {
    return BaseChartView.getCommonViewOptions()
  }
}
