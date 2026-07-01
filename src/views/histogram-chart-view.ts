import type { ViewOption } from 'obsidian'
import type { EChartsOption } from 'echarts'
import { BaseChartView } from './base-chart-view'
import type { BasesData } from '../charts/transformers/base'
import { createHistogramChartOption } from '../charts/transformers/histogram'
import { t } from '../lang/text'

export class HistogramChartView extends BaseChartView {
  type = 'histogram'

  // Specific keys for Histogram
  public static readonly BIN_COUNT_KEY = 'binCount'

  protected getChartOption(data: BasesData): EChartsOption | null {
    if (!data || data.length === 0) {
      return null
    }

    const valueProp = this.config.get(BaseChartView.VALUE_PROP_KEY) as string
    if (!valueProp) {
      return null
    }

    const binCountStr = this.config.get(HistogramChartView.BIN_COUNT_KEY) as string
    // Validate binCount: must be a valid positive integer.
    // If invalid or empty, pass undefined to let transformer use Sturges.
    const parsedBinCount = binCountStr
      ? parseInt(
          binCountStr,
          10,
        )
      : NaN
    const binCount = (!Number.isNaN(parsedBinCount) && parsedBinCount > 0)
      ? parsedBinCount
      : undefined

    const options = {
      ...this.getCommonTransformerOptions(),
      binCount,
      // Map common labels if needed
      yAxisLabel: this.getStringOption(BaseChartView.Y_AXIS_LABEL_KEY) ?? 'Frequency',
      xAxisLabel: this.getStringOption(BaseChartView.X_AXIS_LABEL_KEY) ?? this.getPropDisplayName(BaseChartView.VALUE_PROP_KEY) ?? valueProp,
    }

    return createHistogramChartOption(
      data,
      valueProp,
      options,
    )
  }

  static getViewOptions(): ViewOption[] {
    return [
      {
        displayName: t('views.histogram.value_prop'),
        type: 'property',
        key: BaseChartView.VALUE_PROP_KEY,
        placeholder: t('views.histogram.value_placeholder'),
      },
      {
        displayName: t('views.histogram.bin_count'),
        type: 'text',
        key: HistogramChartView.BIN_COUNT_KEY,
        placeholder: t('views.histogram.bin_count_placeholder'),
      },
      ...BaseChartView.getCommonViewOptions(),
      ...BaseChartView.getAxisViewOptions(),
    ]
  }
}
