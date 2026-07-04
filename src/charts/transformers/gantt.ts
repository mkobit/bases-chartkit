import type { BarSeriesOption, EChartsOption } from 'echarts'
import { Temporal } from 'temporal-polyfill'
import * as R from 'remeda'
import type { BaseTransformerOptions, BasesData } from './base'
import { getLegendOption, getNestedValue, isRecord, safeToString } from './utils'

export interface GanttTransformerOptions extends BaseTransformerOptions {
  readonly taskProp: string
  readonly startProp: string
  readonly endProp: string
  readonly seriesProp?: string
}

interface GanttDataPoint {
  readonly task: string
  readonly start: number
  readonly end: number
  readonly duration: number
  readonly seriesName: string
  readonly dataIndex: number
}

export interface GanttTooltipParam {
  readonly seriesName: string
  readonly name: string
  readonly marker?: string
  readonly data: {
    readonly value: number
    readonly start: number
    readonly end: number
  }
}

function normalizeDate(val: unknown): number | null {
  return typeof val === 'number'
    ? val

    : (val && typeof val === 'object' && 'getTime' in val && typeof (val).getTime === 'function')
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ? (val as { getTime: () => number }).getTime()
        // Bases' Value wrapper for date properties isn't a string or a
        // native Date — unwrap it via safeToString (-> ISO date string)
        // before parsing, or Temporal.Instant/PlainDate always throw.
        : (() => {
            const str = typeof val === 'string' ? val : isRecord(val) ? safeToString(val) : null
            return str === null
              ? null
              : (() => {
                  try {
                    return Temporal.Instant.from(str).epochMilliseconds
                  }
                  catch {
                    try {
                      return Temporal.PlainDate.from(str).toZonedDateTime('UTC').epochMilliseconds
                    }
                    catch {
                      return null
                    }
                  }
                })()
          })()
}

function formatTooltip(params: GanttTooltipParam | ReadonlyArray<GanttTooltipParam>): string {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const p = Array.isArray(params) ? params as ReadonlyArray<GanttTooltipParam> : [params] as ReadonlyArray<GanttTooltipParam>
  const visibleItems = p.filter((item: GanttTooltipParam) => item.seriesName !== '_start')

  return visibleItems.length === 0
    ? ''
    : (() => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const category = (visibleItems[0] as GanttTooltipParam).name

        const itemsHtml = visibleItems.map((item: GanttTooltipParam) => {
          const data = item.data
          const startStr = Temporal.Instant.fromEpochMilliseconds(data.start).toZonedDateTimeISO('UTC').toPlainDate().toString()
          const endStr = Temporal.Instant.fromEpochMilliseconds(data.end).toZonedDateTimeISO('UTC').toPlainDate().toString()

          const marker = item.marker || ''
          const seriesName = item.seriesName || ''

          return `<div>${marker} <b>${seriesName}</b> <br/>Start: ${startStr}<br/>End: ${endStr}<br/>Duration: ${data.value}ms</div>`
        }).join('')

        return `<div><b>${category}</b></div>${itemsHtml}`
      })()
}

export function createGanttChartOption(
  data: BasesData,
  options: GanttTransformerOptions,
): EChartsOption {
  const { taskProp, startProp, endProp, seriesProp } = options

  const validData: readonly GanttDataPoint[] = R.pipe(
    data,
    items => items.map((item, idx) => {
      const task = safeToString(getNestedValue(
        item,
        taskProp,
      ))
      const startRaw = getNestedValue(
        item,
        startProp,
      )
      const endRaw = getNestedValue(
        item,
        endProp,
      )
      const seriesName = seriesProp
        ? safeToString(getNestedValue(
            item,
            seriesProp,
          ))
        : 'Task'

      const start = normalizeDate(startRaw)
      const end = normalizeDate(endRaw)

      const point: GanttDataPoint | null = (!task || start === null || end === null || end < start)
        ? null
        : {
            task,
            start,
            end,
            duration: end - start,
            seriesName,
            dataIndex: idx,
          }
      return point
    }),
    R.filter((x): x is GanttDataPoint => x !== null),
  )

  const tasks: readonly string[] = R.pipe(
    validData,
    R.map(d => d.task),
    R.unique(),
  )

  // The invisible '_start' series stacks from 0, so ECharts' default time-axis
  // auto-range spans [epoch, max end] instead of the actual task window —
  // pin min/max to the real data range explicitly.
  const axisRange = validData.length === 0
    ? undefined
    : {
        min: Math.min(...validData.map(d => d.start)),
        max: Math.max(...validData.map(d => d.end)),
      }

  const groupedData = R.groupBy(
    validData,
    d => d.seriesName ?? 'Default',
  )

  const seriesOptions: ReadonlyArray<BarSeriesOption> = R.pipe(
    Object.entries(groupedData),
    R.flatMap(([sName,
      sData]): ReadonlyArray<BarSeriesOption> => {
      const dataMap = R.indexBy(
        sData,
        d => d.task,
      )

      const startSeriesData = tasks.map((t) => {
        const item = dataMap[t]
        return !item
          ? '-'
          : {
              value: item.start,
              itemStyle: { color: 'transparent' },
            }
      })

      const durationSeriesData = tasks.map((t) => {
        const item = dataMap[t]
        return !item
          ? '-'
          : {
              value: item.duration,
              start: item.start,
              end: item.end,
              seriesName: sName,
            }
      })

      const stackId = `stack_${sName}`

      return [
        {
          name: '_start',
          type: 'bar',
          stack: stackId,
          itemStyle: {
            borderColor: 'transparent',
            color: 'transparent',
          },
          emphasis: {
            itemStyle: {
              borderColor: 'transparent',
              color: 'transparent',
            },
          },
          data: startSeriesData,
          tooltip: { show: false },
          silent: true,
        },
        {
          name: sName,
          type: 'bar',
          stack: stackId,
          data: durationSeriesData,
          label: {
            show: true,
            position: 'inside',
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            formatter: (p: unknown) => (p as GanttTooltipParam).seriesName === 'Task' ? '' : (p as GanttTooltipParam).seriesName,
          },
        },
      ]
    }),
  )

  const legendOption = getLegendOption(options)

  return {
    tooltip: {
      trigger: 'item',
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-restricted-syntax
      formatter: formatTooltip as unknown as NonNullable<EChartsOption['tooltip']> extends { formatter?: infer F } ? F : never,
    },
    // ECharts defaults to listing every series in the legend when `data`
    // isn't set explicitly — that would include the invisible '_start'
    // helper series (used to offset stacked bars), so pin `data` to the
    // real group names only.
    legend: legendOption && { ...legendOption, data: Object.keys(groupedData) },
    grid: {
      containLabel: true,
      left: '3%',
      right: '4%',
      bottom: '3%',
    },
    xAxis: {
      // 'time' would be the natural axis type, but ECharts doesn't compute
      // stacked-bar positions correctly against a 'time' axis — bars silently
      // fail to render. Epoch ms are plain numbers, so 'value' positions them
      // correctly; axisLabel.formatter restores human-readable date ticks.
      type: 'value',
      position: 'top',
      splitLine: { show: true },
      axisLabel: {
        formatter: (value: number) => Temporal.Instant.fromEpochMilliseconds(value).toZonedDateTimeISO('UTC').toPlainDate().toString(),
      },
      ...axisRange,
    },
    yAxis: {
      type: 'category',
      data: [...tasks],
      splitLine: { show: true },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [...seriesOptions],
  }
}
