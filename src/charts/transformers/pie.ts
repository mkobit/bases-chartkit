import type { EChartsOption, PieSeriesOption, DatasetComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption, isRecord, asTooltipFormatter } from './utils'
import { formatValue } from './formatters'
import * as R from 'remeda'

export interface PieTransformerOptions extends BaseTransformerOptions {
  readonly roseType?: 'radius' | 'area'
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
  readonly percent: number
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
function formatTooltip(param: PieTooltipParam, valueFormat?: string): string {
  const marker = param.marker ?? ''
  const rawValue = isPieDataRow(param.value) ? param.value.value : 0
  const value = valueFormat ? formatValue(rawValue, valueFormat) : rawValue.toLocaleString('en-US')
  return `${marker}${param.name}: ${value} (${param.percent}%)`
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
    radius: options?.roseType
      ? [20,
          '75%']
      : '50%',
    ...(options?.roseType ? { roseType: options.roseType } : {}),
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
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
  }

  return opt
}
