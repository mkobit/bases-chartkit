import type {
  BasesOptions,
} from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class TreemapChartView extends BaseChartView {
  readonly type = 'treemap-chart'
  getViewType(): string {
    return 'treemap-chart'
  }

  getDisplayText(): string {
    return 'Treemap'
  }

  getIcon(): string {
    return 'layout-grid'
  }

  static getViewOptions(): BasesOptions[] {
    return [
      {
        displayName: t('views.treemap.path_prop'),
        type: 'property',
        key: BaseChartView.X_AXIS_PROP_KEY, // Map to Path
        placeholder: t('views.treemap.path_placeholder'),
      },
      {
        displayName: t('views.treemap.value_prop'),
        type: 'property',
        key: BaseChartView.VALUE_PROP_KEY,
        placeholder: t('views.treemap.value_prop_placeholder'),
      },
    ]
  }

  protected getChartOption(data: BasesData): EChartsOption | null {
    const pathProp = this.getStringOption(BaseChartView.X_AXIS_PROP_KEY)
    const valueProp = this.getStringOption(BaseChartView.VALUE_PROP_KEY)

    if (!pathProp || !valueProp) {
      return null
    }

    return transformDataToChartOption(
      data,
      pathProp,
      valueProp,
      'treemap',
      this.getCommonTransformerOptions(),
    )
  }

  // ECharts' `treemap` series keeps internal view-state and tree layout diffing
  // between `setOption` calls. When Bases' query resolves asynchronously,
  // the first render often mounts with an empty result set before the real
  // data arrives; the follow-up render with populated data then diffs against
  // that empty root state, freezing the chart on a blank view. `clear()`
  // drops that stale view-state so every render starts from a clean slate.
  protected executeRender(): void {
    this.chart?.clear()
    super.executeRender()
  }
}
