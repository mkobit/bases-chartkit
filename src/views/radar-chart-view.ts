import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class RadarChartView extends BaseChartView {
  public static readonly METRIC_PROPS_KEY = 'metricProps'
  public static readonly SHAPE_KEY = 'shape'
  public static readonly AREA_STYLE_KEY = 'areaStyle'
  public static readonly FILL_AREA_KEY = 'fillArea'
  public static readonly AREA_OPACITY_KEY = 'areaOpacity'

  readonly type = 'radar-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const metricPropsRaw = this.config.get(RadarChartView.METRIC_PROPS_KEY)

    if (typeof xProp !== 'string') {
      return null
    }

    const shape = this.getLiteralOption(RadarChartView.SHAPE_KEY, ['polygon', 'circle'] as const)
    const areaStyle = this.getBooleanOption(RadarChartView.AREA_STYLE_KEY)
    const fillArea = this.getBooleanOption(RadarChartView.FILL_AREA_KEY)
    const areaOpacity = this.getNumberOption(RadarChartView.AREA_OPACITY_KEY)
    const styleOptions = {
      ...(shape !== undefined ? { shape } : {}),
      ...(areaStyle !== undefined ? { areaStyle } : {}),
      ...(fillArea !== undefined ? { fillArea } : {}),
      ...(areaOpacity !== undefined ? { areaOpacity } : {}),
    }

    // One row per entity with a metric per column (e.g. one row per
    // character with Strength/Intelligence/Agility columns) — each metric
    // becomes a radar axis, xProp names each series.
    if (typeof metricPropsRaw === 'string' && metricPropsRaw.trim().length > 0) {
      const metricProps = metricPropsRaw
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
      const metricLabels = Object.fromEntries(
        metricProps.map(prop => [prop, this.getDisplayNameForPropertyPath(prop)]),
      )
      return metricProps.length === 0
        ? null
        : transformDataToChartOption(data, xProp, '', 'radar', {
            ...this.getCommonTransformerOptions(),
            ...styleOptions,
            metricProps,
            metricLabels,
          })
    }

    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)
    const seriesProp = this.config.get(BaseChartView.SERIES_PROP_KEY)

    return typeof yProp !== 'string'
      ? null
      : transformDataToChartOption(data, xProp, yProp, 'radar', {
          ...this.getCommonTransformerOptions(),
          ...styleOptions,
          seriesProp: typeof seriesProp === 'string' ? seriesProp : undefined,
        })
  }

  static getViewOptions(): BasesOptions[] {
    // Clone options to avoid side effects on other charts
    const commonOptions = BaseChartView.getCommonViewOptions().map(opt => {
      const isXAxis = 'key' in opt && opt.key === BaseChartView.X_AXIS_PROP_KEY
      return isXAxis
        ? {
            ...opt,
            displayName: t('views.radar.indicator_prop'),
            placeholder: t('views.radar.indicator_prop_placeholder'),
          }
        : { ...opt }
    })

    return [
      ...commonOptions,
      {
        displayName: t('views.radar.metric_props'),
        type: 'text',
        key: RadarChartView.METRIC_PROPS_KEY,
        placeholder: t('views.radar.metric_props_placeholder'),
      },
    ]
  }
}
