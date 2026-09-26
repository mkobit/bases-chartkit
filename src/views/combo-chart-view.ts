import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class ComboChartView extends BaseChartView {
  readonly type = 'combo-chart'

  public static readonly PRIMARY_TYPE_KEY = 'primaryType'
  public static readonly PRIMARY_STACK_KEY = 'primaryStack'
  public static readonly OVERLAY_PROP_KEY = 'overlayProp'
  public static readonly OVERLAY_TYPE_KEY = 'overlayType'
  public static readonly OVERLAY_DUAL_AXIS_KEY = 'overlayDualAxis'
  public static readonly OVERLAY_Y_AXIS_LABEL_KEY = 'overlayYAxisLabel'
  public static readonly OVERLAY_Y_AXIS_FORMAT_KEY = 'overlayYAxisFormat'
  public static readonly SMOOTH_KEY = 'smooth'
  public static readonly SHOW_SYMBOL_KEY = 'showSymbol'

  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.getStringOption(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.getStringOption(BaseChartView.Y_AXIS_PROP_KEY)
    const seriesProp = this.getStringOption(BaseChartView.SERIES_PROP_KEY)

    if (typeof xProp !== 'string' || typeof yProp !== 'string') {
      return null
    }

    const primaryType = this.getLiteralOption(ComboChartView.PRIMARY_TYPE_KEY, ['bar', 'line'] as const) ?? 'bar'
    const primaryStack = this.getBooleanOption(ComboChartView.PRIMARY_STACK_KEY) ?? (seriesProp !== undefined)
    const overlayProp = this.getStringOption(ComboChartView.OVERLAY_PROP_KEY)
    const overlayType = this.getLiteralOption(ComboChartView.OVERLAY_TYPE_KEY, ['line', 'bar', 'scatter'] as const) ?? 'line'
    const overlayDualAxis = this.getBooleanOption(ComboChartView.OVERLAY_DUAL_AXIS_KEY) ?? true
    const overlayYAxisLabel = this.getStringOption(ComboChartView.OVERLAY_Y_AXIS_LABEL_KEY) ?? this.getPropDisplayName(ComboChartView.OVERLAY_PROP_KEY)
    const overlayYAxisFormat = this.getStringOption(ComboChartView.OVERLAY_Y_AXIS_FORMAT_KEY)
    const smooth = this.getBooleanOption(ComboChartView.SMOOTH_KEY)
    const showSymbol = this.getBooleanOption(ComboChartView.SHOW_SYMBOL_KEY)

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'combo',
      {
        ...this.getCommonTransformerOptions(),
        seriesProp,
        primaryType,
        primaryStack,
        overlayProp,
        overlayType,
        overlayDualAxis,
        overlayYAxisLabel,
        overlayYAxisFormat,
        smooth,
        showSymbol,
      },
    )
  }

  static getViewOptions(): BasesOptions[] {
    return [
      ...BaseChartView.getCommonViewOptions(),
      ...BaseChartView.getAxisViewOptions(),
      {
        displayName: t('views.combo.primary_type'),
        type: 'dropdown',
        key: ComboChartView.PRIMARY_TYPE_KEY,
        options: {
          bar: t('views.combo.types.bar'),
          line: t('views.combo.types.line'),
        },
      },
      {
        displayName: t('views.combo.primary_stack'),
        type: 'toggle',
        key: ComboChartView.PRIMARY_STACK_KEY,
      },
      {
        displayName: t('views.combo.overlay_prop'),
        type: 'property',
        key: ComboChartView.OVERLAY_PROP_KEY,
        placeholder: t('views.combo.overlay_prop_placeholder'),
      },
      {
        displayName: t('views.combo.overlay_type'),
        type: 'dropdown',
        key: ComboChartView.OVERLAY_TYPE_KEY,
        options: {
          line: t('views.combo.types.line'),
          bar: t('views.combo.types.bar'),
          scatter: t('views.combo.types.scatter'),
        },
      },
      {
        displayName: t('views.combo.overlay_dual_axis'),
        type: 'toggle',
        key: ComboChartView.OVERLAY_DUAL_AXIS_KEY,
      },
      {
        displayName: t('views.combo.overlay_y_label'),
        type: 'text',
        key: ComboChartView.OVERLAY_Y_AXIS_LABEL_KEY,
        placeholder: t('views.combo.overlay_y_label_placeholder'),
      },
      {
        displayName: t('views.combo.overlay_y_format'),
        type: 'text',
        key: ComboChartView.OVERLAY_Y_AXIS_FORMAT_KEY,
        placeholder: t('views.combo.overlay_y_format_placeholder'),
      },
      {
        displayName: t('views.line.smooth'),
        type: 'toggle',
        key: ComboChartView.SMOOTH_KEY,
      },
      {
        displayName: t('views.line.show_symbol'),
        type: 'toggle',
        key: ComboChartView.SHOW_SYMBOL_KEY,
      },
    ]
  }
}
