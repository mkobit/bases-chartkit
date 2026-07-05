import type { ViewOption } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class TreeChartView extends BaseChartView {
  readonly type = 'tree-chart'
  getViewType(): string { return 'tree-chart' }

  getDisplayText(): string { return 'Tree' }

  getIcon(): string { return 'network' }

  static getViewOptions(): ViewOption[] {
    return [
      {
        displayName: t('views.tree.path_prop'),
        type: 'property',
        key: BaseChartView.X_AXIS_PROP_KEY,
        placeholder: t('views.tree.path_placeholder'),
      },
    ]
  }

  protected getChartOption(data: BasesData): EChartsOption | null {
    const pathProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY) as string
    if (!pathProp) {
      return null
    }

    return transformDataToChartOption(
      data,
      pathProp,
      '',
      'tree',
      {},
    )
  }

  // ECharts' `tree` series keeps internal expand/collapse view-state between
  // `setOption` calls (via `expandAndCollapse`/animated updates). When Bases'
  // query resolves asynchronously, the first render often mounts with an
  // empty result set before the real data arrives; the follow-up render with
  // populated data then throws inside ECharts' diffing
  // ("Cannot read properties of null (reading '0')") because there's no
  // previous root node to reconcile against, silently freezing the chart on
  // the empty first paint. `clear()` drops that stale view-state so every
  // render starts from a clean slate, same as a first mount.
  protected executeRender(): void {
    this.chart?.clear()
    super.executeRender()
  }
}
