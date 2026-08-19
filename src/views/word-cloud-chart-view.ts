import 'echarts-wordcloud'
import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import { transformDataToChartOption } from '../charts/transformer'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import type { WordCloudTransformerOptions } from '../charts/transformers/extensions/word-cloud'
import { t } from '../lang/text'

export class WordCloudChartView extends BaseChartView {
  readonly type = 'word-cloud-chart'
  protected getChartOption(data: BasesData): EChartsOption | null {
    const xProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY)
    const yProp = this.config.get(BaseChartView.Y_AXIS_PROP_KEY)

    if (typeof xProp !== 'string' || typeof yProp !== 'string') {
      return null
    }

    const transformerOptions: WordCloudTransformerOptions = {
      ...this.getCommonTransformerOptions(),
      shape: this.getLiteralOption('shape', ['circle', 'cardioid', 'diamond', 'triangle-forward', 'triangle', 'pentagon', 'star'] as const),
      gridSize: Number(this.config.get('gridSize') || 2),
      sizeRangeMin: Number(this.config.get('sizeRangeMin') || 12),
      sizeRangeMax: Number(this.config.get('sizeRangeMax') || 60),
      rotationRangeMin: Number(this.config.get('rotationRangeMin') || -90),
      rotationRangeMax: Number(this.config.get('rotationRangeMax') || 90),
      rotationStep: Number(this.config.get('rotationStep') || 45),
    }

    return transformDataToChartOption(
      data,
      xProp,
      yProp,
      'wordCloud',
      transformerOptions,
    )
  }

  static getViewOptions(): BasesOptions[] {
    return [
      ...BaseChartView.getCommonViewOptions(),
      {
        displayName: t('views.word_cloud.options.shape'),
        type: 'dropdown',
        key: 'shape',
        options: {
          'circle': t('views.word_cloud.options.shapes.circle'),
          'cardioid': t('views.word_cloud.options.shapes.cardioid'),
          'diamond': t('views.word_cloud.options.shapes.diamond'),
          'triangle-forward': t('views.word_cloud.options.shapes.triangle_forward'),
          'triangle': t('views.word_cloud.options.shapes.triangle'),
          'pentagon': t('views.word_cloud.options.shapes.pentagon'),
          'star': t('views.word_cloud.options.shapes.star'),
        },
      },
      {
        displayName: t('views.word_cloud.options.grid_size'),
        type: 'text',
        key: 'gridSize',
        placeholder: t('views.word_cloud.options.grid_size_placeholder'),
      },
      {
        displayName: t('views.word_cloud.options.min_font_size'),
        type: 'text',
        key: 'sizeRangeMin',
        placeholder: t('views.word_cloud.options.min_font_size_placeholder'),
      },
      {
        displayName: t('views.word_cloud.options.max_font_size'),
        type: 'text',
        key: 'sizeRangeMax',
        placeholder: t('views.word_cloud.options.max_font_size_placeholder'),
      },
      {
        displayName: t('views.word_cloud.options.rotation_range_min'),
        type: 'text',
        key: 'rotationRangeMin',
        placeholder: t('views.word_cloud.options.rotation_range_min_placeholder'),
      },
      {
        displayName: t('views.word_cloud.options.rotation_range_max'),
        type: 'text',
        key: 'rotationRangeMax',
        placeholder: t('views.word_cloud.options.rotation_range_max_placeholder'),
      },
      {
        displayName: t('views.word_cloud.options.rotation_step'),
        type: 'text',
        key: 'rotationStep',
        placeholder: t('views.word_cloud.options.rotation_step_placeholder'),
      },
    ]
  }
}
