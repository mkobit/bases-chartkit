import type { ViewOption } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import type { ChartType, BasesData } from '../charts/transformers/base'
import type { PictorialBarTransformerOptions } from '../charts/transformers/pictorial-bar'
import { transformDataToChartOption } from '../charts/transformer'
import { t } from '../lang/text'

export class PictorialBarChartView extends BaseChartView {
  type: ChartType = 'pictorialBar'

  getChartOption(data: BasesData) {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY) as string
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY) as string

    const options: PictorialBarTransformerOptions = {
      ...this.getCommonTransformerOptions(),
      seriesProp: this.config.get(BaseChartView.SERIES_PROP_KEY) as string,
      symbol: this.config.get('symbol') as string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      symbolRepeat: this.config.get('symbolRepeat') as any,
      symbolClip: this.config.get('symbolClip') as boolean,
      symbolSize: this.config.get('symbolSize') as string | number,
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'pictorialBar',
      options,
    )
  }

  static getViewOptions(): ViewOption[] {
    return [
      ...BaseChartView.getCommonViewOptions(),
      ...BaseChartView.getAxisViewOptions(),
      {
        key: 'symbol',
        displayName: t('views.pictorial_bar.symbol'),
        type: 'dropdown',
        // description removed as it is not supported
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
