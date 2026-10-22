import type { EChartsOption, FunnelSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, isRecord, safeToString } from './bases-values'
import { getLegendOption } from './legend'
import { asTooltipFormatter } from './tooltip'
import { formatValue } from './formatters'
import * as R from 'remeda'

export interface FunnelTransformerOptions extends BaseTransformerOptions {
  readonly sort?: 'descending' | 'ascending' | 'none'
  readonly funnelAlign?: 'left' | 'right' | 'center'
  readonly gap?: number
  readonly borderRadius?: number
  readonly theme?: string
}

type FunnelDataPoint = Readonly<{
  name: string
  value: number
}>

export interface FunnelTooltipParam {
  readonly name: string
  readonly value: unknown
}

export function formatTooltip(param: FunnelTooltipParam, valueFormat: string): string {
  const rawValue = isRecord(param.value) && 'value' in param.value ? param.value.value : param.value
  const formatted = formatValue(rawValue, valueFormat)
  return `${param.name} : ${formatted}`
}

export function createFunnelChartOption(
  data: BasesData,
  nameProp: string,
  valueProp: string,
  options?: FunnelTransformerOptions,
): EChartsOption {
  // Aggregate rows that share a name so duplicate categories sum into a
  // single funnel stage instead of one segment per row.
  const grouped: Readonly<Record<string, ReadonlyArray<FunnelDataPoint>>> = R.pipe(
    data,
    R.map((item): FunnelDataPoint => {
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
  )

  const resolvedSort: 'descending' | 'ascending' | 'none' | undefined = options?.sort
    ?? (options?.flipAxis ? 'ascending' : undefined)
  const effectiveSort = resolvedSort ?? 'descending'

  const aggregatedData: ReadonlyArray<FunnelDataPoint> = R.pipe(
    R.keys(grouped),
    R.map((name): FunnelDataPoint => ({
      name,
      value: R.sumBy(grouped[name] ?? [], d => d.value),
    })),
  )

  const seriesData: ReadonlyArray<FunnelDataPoint> = effectiveSort === 'none'
    ? aggregatedData
    : R.sortBy(aggregatedData, [x => x.value,
        effectiveSort === 'ascending' ? 'asc' : 'desc'])

  const seriesItem: FunnelSeriesOption = {
    type: 'funnel',
    data: [...seriesData],
    ...(resolvedSort ? { sort: resolvedSort } : {}),
    ...(options?.funnelAlign ? { funnelAlign: options.funnelAlign } : {}),
    ...(options?.gap !== undefined ? { gap: options.gap } : {}),
    ...(options?.borderRadius !== undefined
      ? {
          itemStyle: {
            borderRadius: options.borderRadius,
          },
        }
      : {}),
    label: {
      show: true,
      position: 'inside',
    },
  }

  const valueFormat = options?.valueFormat

  const opt: EChartsOption = {
    series: [seriesItem],
    tooltip: {
      trigger: 'item',
      formatter: valueFormat !== undefined
        ? asTooltipFormatter((param: FunnelTooltipParam) => formatTooltip(param, valueFormat))
        : '{b} : {c}%',
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
    ...(options?.theme ? { theme: options.theme } : {}),
  }

  return opt
}
