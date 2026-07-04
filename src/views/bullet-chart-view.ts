import { BaseChartView } from './base-chart-view'
import type { BasesData } from '../charts/transformers/base'
import { transformDataToChartOption } from '../charts/transformer'
import type { ViewOption } from 'obsidian'
import type { EChartsOption } from 'echarts'
import { t } from '../lang/text'

export class BulletChartView extends BaseChartView {
  // Config Keys
  public static readonly TARGET_PROP_KEY = 'targetProp'
  public static readonly RANGE_LOW_PROP_KEY = 'rangeLowProp'
  public static readonly RANGE_MID_PROP_KEY = 'rangeMidProp'
  public static readonly RANGE_HIGH_PROP_KEY = 'rangeHighProp'

  type = 'bullet'

  protected getChartOption(data: BasesData): EChartsOption | null {
    const categoryProp = this.config.get(BaseChartView.X_AXIS_PROP_KEY) as string
    const valueProp = this.config.get(BaseChartView.VALUE_PROP_KEY) as string
    const targetProp = this.config.get(BulletChartView.TARGET_PROP_KEY) as string
    const rangeLowProp = this.config.get(BulletChartView.RANGE_LOW_PROP_KEY) as string
    const rangeMidProp = this.config.get(BulletChartView.RANGE_MID_PROP_KEY) as string
    const rangeHighProp = this.config.get(BulletChartView.RANGE_HIGH_PROP_KEY) as string

    if (!categoryProp || !valueProp) {
      return null
    }

    return transformDataToChartOption(
      data,
      categoryProp,
      valueProp,
      'bullet',
      {
        ...this.getCommonTransformerOptions(),
        yAxisLabel: this.getStringOption(BaseChartView.Y_AXIS_LABEL_KEY) ?? this.getPropDisplayName(BaseChartView.VALUE_PROP_KEY) ?? valueProp,
        targetProp,
        rangeLowProp,
        rangeMidProp,
        rangeHighProp,
      },
    )
  }

  static getViewOptions(): ViewOption[] {
    return [
      {
        displayName: t('views.bullet.category_prop'),
        type: 'property',
        key: BaseChartView.X_AXIS_PROP_KEY,
        placeholder: t('views.bullet.category_placeholder'),
      },
      {
        displayName: t('views.bullet.value_prop'),
        type: 'property',
        key: BaseChartView.VALUE_PROP_KEY,
        placeholder: t('views.bullet.value_placeholder'),
      },
      {
        displayName: t('views.bullet.target_prop'),
        type: 'property',
        key: BulletChartView.TARGET_PROP_KEY,
        placeholder: t('views.bullet.target_placeholder'),
      },
      {
        displayName: t('views.bullet.range_low_prop'),
        type: 'property',
        key: BulletChartView.RANGE_LOW_PROP_KEY,
        placeholder: t('views.bullet.range_low_placeholder'),
      },
      {
        displayName: t('views.bullet.range_mid_prop'),
        type: 'property',
        key: BulletChartView.RANGE_MID_PROP_KEY,
        placeholder: t('views.bullet.range_mid_placeholder'),
      },
      {
        displayName: t('views.bullet.range_high_prop'),
        type: 'property',
        key: BulletChartView.RANGE_HIGH_PROP_KEY,
        placeholder: t('views.bullet.range_high_placeholder'),
      },
      ...BaseChartView.getCommonViewOptions().filter((opt) => {
        // Type narrowing or check if 'key' exists
        if ('key' in opt) {
          return opt.key !== BaseChartView.X_AXIS_PROP_KEY
            && opt.key !== BaseChartView.Y_AXIS_PROP_KEY
            && opt.key !== BaseChartView.SERIES_PROP_KEY
        }
        return true
      }),
      ...BaseChartView.getAxisViewOptions(),
    ]
  }
}
