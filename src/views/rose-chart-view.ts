import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'

export class RoseChartView extends BaseChartView {
  public static readonly ROSE_TYPE_KEY = 'roseType'
  public static readonly INNER_RADIUS_KEY = 'innerRadius'
  public static readonly OUTER_RADIUS_KEY = 'outerRadius'
  public static readonly PAD_ANGLE_KEY = 'padAngle'
  public static readonly BORDER_RADIUS_KEY = 'borderRadius'

  readonly type = 'rose-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)

    if (typeof xProp !== 'string' || typeof yProp !== 'string') {
      return null
    }

    const roseType = this.getLiteralOption(RoseChartView.ROSE_TYPE_KEY, ['radius', 'area'] as const)
    const innerRadius = this.getStringOrNumberOption(RoseChartView.INNER_RADIUS_KEY)
    const outerRadius = this.getStringOrNumberOption(RoseChartView.OUTER_RADIUS_KEY)
    const padAngle = this.getNumberOption(RoseChartView.PAD_ANGLE_KEY)
    const borderRadius = this.getNumberOption(RoseChartView.BORDER_RADIUS_KEY)

    return transformDataToChartOption(data, xProp, yProp, 'rose', {
      ...this.getCommonTransformerOptions(),
      ...(roseType !== undefined ? { roseType } : {}),
      ...(innerRadius !== undefined ? { innerRadius } : {}),
      ...(outerRadius !== undefined ? { outerRadius } : {}),
      ...(padAngle !== undefined ? { padAngle } : {}),
      ...(borderRadius !== undefined ? { borderRadius } : {}),
    })
  }

  static getViewOptions(): BasesOptions[] {
    return BaseChartView.getCommonViewOptions()
  }
}
