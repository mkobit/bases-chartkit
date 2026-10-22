import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { FunnelTransformerOptions } from '../charts/transformers/funnel'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'

export class FunnelChartView extends BaseChartView {
  public static readonly SORT_KEY = 'sort'
  public static readonly FUNNEL_ALIGN_KEY = 'funnelAlign'
  public static readonly GAP_KEY = 'gap'
  public static readonly BORDER_RADIUS_KEY = 'borderRadius'

  readonly type = 'funnel-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)

    if (typeof xProp !== 'string' || typeof yProp !== 'string') {
      return null
    }

    const sort = this.getLiteralOption(FunnelChartView.SORT_KEY, ['descending', 'ascending', 'none'] as const)
    const funnelAlign = this.getLiteralOption(FunnelChartView.FUNNEL_ALIGN_KEY, ['left', 'right', 'center'] as const)
    const theme = this.getStringOption(BaseChartView.THEME_KEY)

    const gapRaw = this.config.get(FunnelChartView.GAP_KEY)
    const gap = typeof gapRaw === 'number'
      ? gapRaw
      : (typeof gapRaw === 'string' && gapRaw.trim() !== '' && !Number.isNaN(Number(gapRaw)) ? Number(gapRaw) : undefined)

    const borderRadiusRaw = this.config.get(FunnelChartView.BORDER_RADIUS_KEY)
    const borderRadius = typeof borderRadiusRaw === 'number'
      ? borderRadiusRaw
      : (typeof borderRadiusRaw === 'string' && borderRadiusRaw.trim() !== '' && !Number.isNaN(Number(borderRadiusRaw)) ? Number(borderRadiusRaw) : undefined)

    const options: FunnelTransformerOptions = {
      ...this.getCommonTransformerOptions(),
      ...(sort ? { sort } : {}),
      ...(funnelAlign ? { funnelAlign } : {}),
      ...(gap !== undefined ? { gap } : {}),
      ...(borderRadius !== undefined ? { borderRadius } : {}),
      ...(theme ? { theme } : {}),
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'funnel',
      options,
    )
  }

  static getViewOptions(): BasesOptions[] {
    // Strip Series Prop; the funnel transformer doesn't support multi-series yet.
    return BaseChartView.getCommonViewOptions().filter((o) => {
      if ('key' in o) {
        return o.key !== BaseChartView.SERIES_PROP_KEY
      }
      return true
    })
  }
}
