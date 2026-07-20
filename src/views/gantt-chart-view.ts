import type { ViewOption } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { t } from '../lang/text'

export class GanttChartView extends BaseChartView {
  readonly type = 'gantt-chart'

  static readonly TASK_PROP_KEY = 'taskProp'
  static readonly START_PROP_KEY = 'startProp'
  static readonly END_PROP_KEY = 'endProp'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const taskProp = this.config.get(GanttChartView.TASK_PROP_KEY)
    const startProp = this.config.get(GanttChartView.START_PROP_KEY)
    const endProp = this.config.get(GanttChartView.END_PROP_KEY)
    const seriesProp = this.config.get(BaseChartView.SERIES_PROP_KEY) // Optional grouping

    const showLegend = this.config.get(BaseChartView.LEGEND_KEY) as boolean

    if (typeof taskProp !== 'string' || typeof startProp !== 'string' || typeof endProp !== 'string') {
      return null
    }

    return transformDataToChartOption(
      data,
      taskProp,
      '',
      'gantt',
      {
        taskProp,
        startProp,
        endProp,
        seriesProp: typeof seriesProp === 'string' ? seriesProp : undefined,
        legend: showLegend,
      },
    )
  }

  static getViewOptions(): ViewOption[] {
    return [
      {
        key: GanttChartView.TASK_PROP_KEY,
        displayName: t('views.gantt.task_prop'),
        type: 'property',
        placeholder: t('views.gantt.task_prop_placeholder'),
      },
      {
        key: GanttChartView.START_PROP_KEY,
        displayName: t('views.gantt.start_prop'),
        type: 'property',
        placeholder: t('views.gantt.start_prop_placeholder'),
      },
      {
        key: GanttChartView.END_PROP_KEY,
        displayName: t('views.gantt.end_prop'),
        type: 'property',
        placeholder: t('views.gantt.end_prop_placeholder'),
      },
      {
        key: BaseChartView.SERIES_PROP_KEY,
        displayName: t('views.gantt.group_prop'),
        type: 'property',
        placeholder: t('views.gantt.group_prop_placeholder'),
      },
      ...BaseChartView.getCommonViewOptions().filter((o) => {
        const key = (o as { key?: string }).key
        return key !== BaseChartView.X_AXIS_PROP_KEY
          && key !== BaseChartView.Y_AXIS_PROP_KEY
          && key !== BaseChartView.SERIES_PROP_KEY
      }),
    ]
  }
}
