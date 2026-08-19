import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

const AGGREGATIONS = ['sum', 'avg', 'min', 'max', 'last'] as const
type Aggregation = typeof AGGREGATIONS[number]

function isAggregation(value: unknown): value is Aggregation {
  return typeof value === 'string' && AGGREGATIONS.some(a => a === value)
}

interface GaugeColorBand {
  readonly threshold: number
  readonly color: string
}

// Parses the comma-separated "threshold:color" list (e.g.
// "30:#67e0e3,70:#37a2da,100:#fd666d") into color-band definitions, mirroring
// the comma-separated list convention BaseChartView already uses for
// visualMapColor. Invalid pairs (non-numeric threshold, missing color) are
// dropped rather than breaking the whole list.
function parseColorBands(raw: unknown): ReadonlyArray<GaugeColorBand> | undefined {
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined
  }

  const bands = raw
    .split(',')
    .map((pair): GaugeColorBand | null => {
      const [thresholdStr, color] = pair.split(':').map(s => s.trim())
      const threshold = Number(thresholdStr)
      return (color && !Number.isNaN(threshold)) ? { threshold, color } : null
    })
    .filter((band): band is GaugeColorBand => band !== null)

  return bands.length > 0 ? bands : undefined
}

export class GaugeChartView extends BaseChartView {
  public static readonly AGGREGATION_KEY = 'aggregation'
  public static readonly COLOR_BANDS_KEY = 'colorBands'

  readonly type = 'gauge-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)
    const minVal = Number(this.config.get(BaseChartView.MIN_VALUE_KEY))
    const maxVal = Number(this.config.get(BaseChartView.MAX_VALUE_KEY))
    const aggregationRaw = this.config.get(GaugeChartView.AGGREGATION_KEY)
    const colorBandsRaw = this.config.get(GaugeChartView.COLOR_BANDS_KEY)

    if (typeof yProp !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      '',
      yProp,
      'gauge',
      {
        ...this.getCommonTransformerOptions(),
        min: isNaN(minVal) ? 0 : minVal,
        max: isNaN(maxVal) ? 100 : maxVal,
        aggregation: isAggregation(aggregationRaw) ? aggregationRaw : 'sum',
        yAxisLabel: this.getPropDisplayName(BaseChartView.Y_AXIS_PROP_KEY) ?? yProp,
        colorBands: parseColorBands(colorBandsRaw),
      },
    )
  }

  static getViewOptions(): BasesOptions[] {
    return [
      {
        displayName: t('views.gauge.value_prop'),
        type: 'property',
        key: BaseChartView.Y_AXIS_PROP_KEY,
        placeholder: t('views.gauge.value_prop_placeholder'),
      },
      {
        displayName: t('views.gauge.aggregation'),
        type: 'dropdown',
        key: GaugeChartView.AGGREGATION_KEY,
        default: 'sum',
        options: {
          sum: t('views.gauge.aggregation_options.sum'),
          avg: t('views.gauge.aggregation_options.avg'),
          min: t('views.gauge.aggregation_options.min'),
          max: t('views.gauge.aggregation_options.max'),
          last: t('views.gauge.aggregation_options.last'),
        },
      },
      {
        displayName: t('views.gauge.min_value'),
        type: 'text',
        key: BaseChartView.MIN_VALUE_KEY,
        placeholder: '0',
      },
      {
        displayName: t('views.gauge.max_value'),
        type: 'text',
        key: BaseChartView.MAX_VALUE_KEY,
        placeholder: '100',
      },
      {
        displayName: t('views.gauge.color_bands'),
        type: 'text',
        key: GaugeChartView.COLOR_BANDS_KEY,
        placeholder: t('views.gauge.color_bands_placeholder'),
      },
      ...BaseChartView.getCommonViewOptions().filter((o) => {
        const key = o.key
        return key !== BaseChartView.X_AXIS_PROP_KEY && key !== BaseChartView.Y_AXIS_PROP_KEY && key !== BaseChartView.SERIES_PROP_KEY
      }),
    ]
  }
}
