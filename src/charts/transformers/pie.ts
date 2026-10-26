import type { EChartsOption, PieSeriesOption, DatasetComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, isRecord, safeToString } from './bases-values'
import { getLegendOption } from './legend'
import { asTooltipFormatter } from './tooltip'
import { formatValue } from './formatters'
import { COLOR_TOKENS, STYLE_TOKENS } from './tokens'
import * as R from 'remeda'

export interface PieTransformerOptions extends BaseTransformerOptions {
  readonly roseType?: 'radius' | 'area'
  readonly innerRadius?: string | number
  readonly outerRadius?: string | number
  readonly radius?: string | number | readonly (string | number)[]
  readonly donut?: boolean
  readonly padAngle?: number
  readonly borderRadius?: number
  readonly theme?: string
}

interface PieDataPoint {
  readonly name: string
  readonly value: number
}

export interface PieTooltipParam {
  readonly name: string
  // Not a number: ECharts' CallbackDataParams.value is built from
  // getRawValue(), which for an object-row dataset source with no dim
  // argument returns the WHOLE raw row (retrieveRawValue in
  // node_modules/echarts/lib/data/helper/dataProvider.js only narrows to a
  // single dim's value when one is explicitly passed) -- so this is the raw
  // `PieDataPoint` row `{name, value}`, not the number by itself. Confirmed
  // live: treating it as a number rendered the tooltip as "[object Object]".
  readonly value: unknown
  // PieSeriesModel.getDataParams (node_modules/echarts/lib/chart/pie/PieSeries.js)
  // computes and injects this -- it's not part of the raw dataset row.
  readonly percent?: number
  readonly marker?: string
}

function isPieDataRow(val: unknown): val is PieDataPoint {
  return isRecord(val) && typeof val.value === 'number'
}

// The default tooltip (no formatter) shows only "name: value" -- for
// rose/pie's angle-or-radius-encoded wedges, the value alone doesn't convey
// how it compares to the whole, which is the more common thing a hover is
// trying to answer. Percent (already computed by ECharts, see PieTooltipParam
// above) makes that comparison explicit.
export function formatTooltip(param: PieTooltipParam, valueFormat?: string): string {
  const marker = param.marker ?? ''
  const rawValue = isPieDataRow(param.value) ? param.value.value : 0
  const value = valueFormat ? formatValue(rawValue, valueFormat) : rawValue.toLocaleString('en-US')
  const percentSuffix = typeof param.percent === 'number' ? ` (${param.percent}%)` : ''
  return `${marker}${param.name}: ${value}${percentSuffix}`
}

function resolveRadius(
  options?: PieTransformerOptions,
): PieSeriesOption['radius'] {
  if (options?.radius !== undefined) {
    if (typeof options.radius === 'string' || typeof options.radius === 'number') {
      return options.radius
    }
    return [...options.radius]
  }
  if (options?.innerRadius !== undefined || options?.outerRadius !== undefined) {
    return [options.innerRadius ?? (options.donut ? '40%' : 0), options.outerRadius ?? '70%']
  }
  if (options?.donut) {
    return ['40%', '70%']
  }
  if (options?.roseType) {
    return [20, '75%']
  }
  return '50%'
}

export function createPieChartOption(
  data: BasesData,
  nameProp: string,
  valueProp: string,
  options?: PieTransformerOptions,
): EChartsOption {
  // Aggregate rows that share a name so duplicate categories sum into a
  // single slice instead of one per row.
  const normalizedData: ReadonlyArray<PieDataPoint> = R.pipe(
    data,
    R.map((item): PieDataPoint => {
      const valRaw = getNestedValue(
        item,
        nameProp,
      )
      const name = valRaw === undefined || valRaw === null ? 'Unknown' : safeToString(valRaw)

      const val = Number(getNestedValue(
        item,
        valueProp,
      ))
      return {
        name: name,
        value: Number.isNaN(val) ? 0 : val,
      }
    }),
    R.groupBy(d => d.name),
    R.entries(),
    // eslint-disable-next-line functional/prefer-immutable-types -- readonly tuple destructuring isn't recognized here even when explicitly typed (bd memory: prefer-immutable-types-readonly-tuple-gap); PieDataPoint itself is all-readonly.
    R.map(([name, items]): PieDataPoint => ({
      name,
      value: R.sumBy(items, d => d.value),
    })),
  )

  const dataset: DatasetComponentOption = {
    source: normalizedData,
  }

  const seriesItem: PieSeriesOption = {
    type: 'pie',
    datasetIndex: 0,
    encode: {
      itemName: 'name',
      value: 'value',
    },
    radius: resolveRadius(options),
    ...(options?.roseType ? { roseType: options.roseType } : {}),
    ...(options?.padAngle !== undefined ? { padAngle: options.padAngle } : {}),
    ...(options?.borderRadius !== undefined
      ? {
          itemStyle: {
            borderRadius: options.borderRadius,
          },
        }
      : {}),
    emphasis: {
      itemStyle: {
        shadowBlur: STYLE_TOKENS.shadowBlur.standard,
        shadowOffsetX: 0,
        shadowColor: COLOR_TOKENS.chrome.shadows.standard,
      },
    },
  }

  const opt: EChartsOption = {
    dataset: [dataset],
    series: [seriesItem],
    tooltip: {
      trigger: 'item',
      formatter: asTooltipFormatter((param: PieTooltipParam) => formatTooltip(param, options?.valueFormat)),
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
    ...(options?.theme ? { theme: options.theme } : {}),
  }

  return opt
}
