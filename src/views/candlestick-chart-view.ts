import type {
  BasesOptions,
} from 'obsidian'
import type { EChartsOption } from 'echarts'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class CandlestickChartView extends BaseChartView {
  public static readonly OPEN_PROP_KEY = 'openProp'
  public static readonly CLOSE_PROP_KEY = 'closeProp'
  public static readonly LOW_PROP_KEY = 'lowProp'
  public static readonly HIGH_PROP_KEY = 'highProp'

  readonly type = 'candlestick-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.getStringOption(BaseChartView.X_AXIS_PROP_KEY)

    const openProp = this.getStringOption(CandlestickChartView.OPEN_PROP_KEY)
    const closeProp = this.getStringOption(CandlestickChartView.CLOSE_PROP_KEY)
    const lowProp = this.getStringOption(CandlestickChartView.LOW_PROP_KEY)
    const highProp = this.getStringOption(CandlestickChartView.HIGH_PROP_KEY)

    if (!xProp || !openProp || !closeProp || !lowProp || !highProp) {
      return null
    }

    return transformDataToChartOption(
      data,
      xProp,
      '',
      'candlestick',
      {
        ...this.getCommonTransformerOptions(),
        openProp,
        closeProp,
        lowProp,
        highProp,
      },
    )
  }

  static getViewOptions(): BasesOptions[] {
    return [
      {
        displayName: t('views.candlestick.x_axis_prop'),
        type: 'property',
        key: BaseChartView.X_AXIS_PROP_KEY,
        placeholder: t('views.candlestick.x_axis_placeholder'),
      },
      {
        displayName: t('views.candlestick.open_prop'),
        type: 'property',
        key: CandlestickChartView.OPEN_PROP_KEY,
        placeholder: t('views.candlestick.open_placeholder'),
      },
      {
        displayName: t('views.candlestick.close_prop'),
        type: 'property',
        key: CandlestickChartView.CLOSE_PROP_KEY,
        placeholder: t('views.candlestick.close_placeholder'),
      },
      {
        displayName: t('views.candlestick.low_prop'),
        type: 'property',
        key: CandlestickChartView.LOW_PROP_KEY,
        placeholder: t('views.candlestick.low_placeholder'),
      },
      {
        displayName: t('views.candlestick.high_prop'),
        type: 'property',
        key: CandlestickChartView.HIGH_PROP_KEY,
        placeholder: t('views.candlestick.high_placeholder'),
      },
      ...BaseChartView.getAxisViewOptions().filter(opt => opt.key !== BaseChartView.FLIP_AXIS_KEY),
    ]
  }
}
