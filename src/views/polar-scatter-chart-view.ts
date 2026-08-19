import type { BasesOptions } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import type { BasesData } from '../charts/transformers/base'
import type { EChartsOption } from 'echarts'
import { transformDataToChartOption } from '../charts/transformer'
import { t } from '../lang/text'

export class PolarScatterChartView extends BaseChartView {
  type = 'polar-scatter-chart'

  getChartOption(data: BasesData): EChartsOption {
    return transformDataToChartOption(
      data,
      // '' is a safe fallback for the required xProp/yProp positional slots --
      // getChartOption has no null-config guard (unlike most other chart
      // views), so an absent/invalid config value degrades to an empty-string
      // property path (already tolerated by getNestedValue) rather than a
      // cast that silently lies about an undefined value being a string.
      this.getStringOption(BaseChartView.X_AXIS_PROP_KEY) ?? '',
      this.getStringOption(BaseChartView.Y_AXIS_PROP_KEY) ?? '',
      'polarScatter',
      {
        ...this.getCommonTransformerOptions(),
        seriesProp: this.getStringOption(BaseChartView.SERIES_PROP_KEY),
        sizeProp: this.getStringOption(BaseChartView.SIZE_PROP_KEY),
        sizeLabel: this.getPropDisplayName(BaseChartView.SIZE_PROP_KEY),
        visualMapMin: this.config.get(BaseChartView.VISUAL_MAP_MIN_KEY) ? Number(this.config.get(BaseChartView.VISUAL_MAP_MIN_KEY)) : undefined,
        visualMapMax: this.config.get(BaseChartView.VISUAL_MAP_MAX_KEY) ? Number(this.config.get(BaseChartView.VISUAL_MAP_MAX_KEY)) : undefined,
        visualMapColor: this.getStringOption(BaseChartView.VISUAL_MAP_COLOR_KEY)?.split(','),
        visualMapOrient: this.getLiteralOption(BaseChartView.VISUAL_MAP_ORIENT_KEY, ['horizontal', 'vertical'] as const),
        visualMapType: this.getLiteralOption(BaseChartView.VISUAL_MAP_TYPE_KEY, ['continuous', 'piecewise'] as const),
      },
    )
  }

  public static getViewOptions(): BasesOptions[] {
    return [
      {
        displayName: t('views.polar.angle_prop'),
        key: BaseChartView.X_AXIS_PROP_KEY,
        type: 'property',
      },
      {
        displayName: t('views.polar.radius_prop'),
        key: BaseChartView.Y_AXIS_PROP_KEY,
        type: 'property',
      },
      {
        displayName: t('views.polar.series_prop'),
        key: BaseChartView.SERIES_PROP_KEY,
        type: 'property',
      },
      {
        displayName: t('views.polar.size_prop'),
        key: BaseChartView.SIZE_PROP_KEY,
        type: 'property',
      },
      {
        displayName: t('views.common.show_legend'),
        type: 'toggle',
        key: BaseChartView.LEGEND_KEY,
      },
      {
        displayName: t('views.common.legend_position'),
        type: 'dropdown',
        key: BaseChartView.LEGEND_POSITION_KEY,
        options: {
          top: t('views.common.legend_position_options.top'),
          bottom: t('views.common.legend_position_options.bottom'),
          left: t('views.common.legend_position_options.left'),
          right: t('views.common.legend_position_options.right'),
        },
      },
      {
        displayName: t('views.common.legend_orient'),
        type: 'dropdown',
        key: BaseChartView.LEGEND_ORIENT_KEY,
        options: {
          horizontal: t('views.common.legend_orient_options.horizontal'),
          vertical: t('views.common.legend_orient_options.vertical'),
        },
      },
      {
        displayName: t('views.visual_map.min'),
        type: 'text',
        key: BaseChartView.VISUAL_MAP_MIN_KEY,
        placeholder: t('views.visual_map.min_placeholder'),
      },
      {
        displayName: t('views.visual_map.max'),
        type: 'text',
        key: BaseChartView.VISUAL_MAP_MAX_KEY,
        placeholder: t('views.visual_map.max_placeholder'),
      },
      {
        displayName: t('views.visual_map.colors'),
        type: 'text',
        key: BaseChartView.VISUAL_MAP_COLOR_KEY,
        placeholder: t('views.visual_map.colors_placeholder'),
      },
      {
        displayName: t('views.visual_map.orient'),
        type: 'dropdown',
        key: BaseChartView.VISUAL_MAP_ORIENT_KEY,
        options: {
          horizontal: t('views.visual_map.orient_options.horizontal'),
          vertical: t('views.visual_map.orient_options.vertical'),
        },
      },
      {
        displayName: t('views.visual_map.type'),
        type: 'dropdown',
        key: BaseChartView.VISUAL_MAP_TYPE_KEY,
        options: {
          continuous: t('views.visual_map.type_options.continuous'),
          piecewise: t('views.visual_map.type_options.piecewise'),
        },
      },
      {
        displayName: t('views.common.height'),
        type: 'text',
        key: BaseChartView.HEIGHT_KEY,
        placeholder: t('views.common.height_placeholder'),
      },
    ]
  }
}
