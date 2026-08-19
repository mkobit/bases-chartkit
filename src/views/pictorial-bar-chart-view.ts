import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import type { ChartType, BasesData } from '../charts/transformers/base'
import type { PictorialBarTransformerOptions } from '../charts/transformers/pictorial-bar'
import { transformDataToChartOption } from '../charts/transformer'
import { t } from '../lang/text'

export class PictorialBarChartView extends BaseChartView {
  type: ChartType = 'pictorialBar'

  getChartOption(data: BasesData) {
    // '' is a safe fallback for the required xProp/yProp positional slots --
    // this view has no null-config guard before rendering.
    const xProp = this.getStringOption(BaseChartView.X_AXIS_PROP_KEY) ?? ''
    const yProp = this.getStringOption(BaseChartView.Y_AXIS_PROP_KEY) ?? ''

    const options: PictorialBarTransformerOptions = {
      ...this.getCommonTransformerOptions(),
      seriesProp: this.getStringOption(BaseChartView.SERIES_PROP_KEY),
      symbol: this.getStringOption('symbol'),
      symbolRepeat: this.getLiteralOption('symbolRepeat', ['fixed', 'true', 'false'] as const),
      symbolClip: this.getBooleanOption('symbolClip'),
      symbolSize: this.getStringOption('symbolSize'),
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'pictorialBar',
      options,
    )
  }

  static getViewOptions(): BasesOptions[] {
    return [
      ...BaseChartView.getCommonViewOptions(),
      ...BaseChartView.getAxisViewOptions(),
      {
        key: 'symbol',
        displayName: t('views.pictorial_bar.symbol'),
        type: 'dropdown',
        options: {
          circle: t('views.pictorial_bar.symbol_options.circle'),
          rect: t('views.pictorial_bar.symbol_options.rect'),
          roundRect: t('views.pictorial_bar.symbol_options.roundRect'),
          triangle: t('views.pictorial_bar.symbol_options.triangle'),
          diamond: t('views.pictorial_bar.symbol_options.diamond'),
          pin: t('views.pictorial_bar.symbol_options.pin'),
          arrow: t('views.pictorial_bar.symbol_options.arrow'),
          none: t('views.pictorial_bar.symbol_options.none'),
        },
      },
      {
        key: 'symbolRepeat',
        displayName: t('views.pictorial_bar.symbol_repeat'),
        type: 'dropdown',
        options: {
          false: t('views.pictorial_bar.symbol_repeat_options.false'),
          true: t('views.pictorial_bar.symbol_repeat_options.true'),
          fixed: t('views.pictorial_bar.symbol_repeat_options.fixed'),
        },
      },
      {
        key: 'symbolClip',
        displayName: t('views.pictorial_bar.symbol_clip'),
        type: 'toggle',
      },
      {
        key: 'symbolSize',
        displayName: t('views.pictorial_bar.symbol_size'),
        type: 'text',
        placeholder: t('views.pictorial_bar.symbol_size_placeholder'),
      },
    ]
  }
}
