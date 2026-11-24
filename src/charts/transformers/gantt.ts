import type { BarSeriesOption, EChartsOption } from 'echarts'
import * as R from 'remeda'
import type { BaseTransformerOptions, BasesData } from './base'
import { extractRowMetadata, getNestedValue, safeToString } from './bases-values'
import { parseDateToEpochMs } from './dates'
import { getLegendOption } from './legend'
import { asTooltipFormatter } from './tooltip'
import { formatDateValue, formatDurationMs, formatValue } from './formatters'
import { COLOR_TOKENS } from './tokens'

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
  readonly filePath?: string
}

export interface GanttTooltipParam {
  readonly seriesName: string
  readonly name: string
  readonly marker?: string
  readonly data: {
    readonly value: number
    readonly start: number
    readonly end: number
    readonly rowIndex?: number
    readonly filePath?: string
  }
}

function formatTooltip(params: GanttTooltipParam | ReadonlyArray<GanttTooltipParam>, valueFormat?: string): string {
  const p: ReadonlyArray<GanttTooltipParam> = Array.isArray(params) ? params : [params]
  const visibleItems = p.filter((item: GanttTooltipParam) => item.seriesName !== '_start')
  const [firstVisible] = visibleItems

  return !firstVisible
    ? ''
    : (() => {
        const category = firstVisible.name

        const itemsHtml = visibleItems.map((item: GanttTooltipParam) => {
          const data = item.data
          const startStr = Temporal.Instant.fromEpochMilliseconds(data.start).toZonedDateTimeISO('UTC').toPlainDate().toString()
          const endStr = Temporal.Instant.fromEpochMilliseconds(data.end).toZonedDateTimeISO('UTC').toPlainDate().toString()

          const marker = item.marker || ''
          const seriesName = item.seriesName || ''
          const durationStr = valueFormat ? formatValue(data.value, valueFormat) : formatDurationMs(data.value)

          return `<div>${marker} <b>${seriesName}</b> <br/>Start: ${startStr}<br/>End: ${endStr}<br/>Duration: ${durationStr}</div>`
        }).join('')

        return `<div><b>${category}</b></div>${itemsHtml}`
      })()
}

const MS_PER_DAY = 86_400_000

function isQuarterFormat(xAxisFormat: string): boolean {
  return xAxisFormat === 'quarter' || xAxisFormat === 'Q' || /\[Q\]|Q/.test(xAxisFormat)
}

function isMonthOnlyFormat(xAxisFormat: string): boolean {
  return /M/.test(xAxisFormat) && !/[Dd]/.test(xAxisFormat)
}

/**
 * Computes a minimum tick interval in milliseconds for coarse date formats
 * (quarters or months) so ECharts does not emit duplicate formatted tick labels.
 */
function getTimeAxisMinInterval(xAxisFormat?: string): number | undefined {
  if (!xAxisFormat) {
    return undefined
  }
  if (isQuarterFormat(xAxisFormat)) {
    return 92 * MS_PER_DAY
  }
  if (isMonthOnlyFormat(xAxisFormat)) {
    return 31 * MS_PER_DAY
  }
  return undefined
}

/**
 * Generates one tick timestamp per distinct calendar period (quarter or month)
 * within `[minMs, maxMs]` so coarse `xAxisFormat` labels never repeat.
 */
function getTimeAxisCustomValues(
  minMs: number,
  maxMs: number,
  xAxisFormat?: string,
): readonly number[] | undefined {
  if (!xAxisFormat || maxMs <= minMs) {
    return undefined
  }

  const startZdt = Temporal.Instant.fromEpochMilliseconds(minMs).toZonedDateTimeISO('UTC')
  const endZdt = Temporal.Instant.fromEpochMilliseconds(maxMs).toZonedDateTimeISO('UTC')

  if (isQuarterFormat(xAxisFormat)) {
    const startQ = startZdt.year * 4 + Math.floor((startZdt.month - 1) / 3)
    const endQ = endZdt.year * 4 + Math.floor((endZdt.month - 1) / 3)
    const count = endQ - startQ + 1
    const rawTicks = Array.from({ length: count }, (_, i) => {
      const qIndex = startQ + i
      const year = Math.floor(qIndex / 4)
      const month = (qIndex % 4) * 3 + 1
      const periodStartMs = Temporal.PlainDate.from({ year, month, day: 1 }).toZonedDateTime('UTC').epochMilliseconds
      return periodStartMs < minMs ? minMs : periodStartMs
    }).filter(ms => ms >= minMs && ms <= maxMs)

    return rawTicks.filter((ms, idx) => {
      const next = rawTicks[idx + 1]
      return next === undefined || next - ms >= 21 * MS_PER_DAY
    })
  }

  if (isMonthOnlyFormat(xAxisFormat)) {
    const startM = startZdt.year * 12 + (startZdt.month - 1)
    const endM = endZdt.year * 12 + (endZdt.month - 1)
    const count = endM - startM + 1
    return Array.from({ length: count }, (_, i) => {
      const mIndex = startM + i
      const year = Math.floor(mIndex / 12)
      const month = (mIndex % 12) + 1
      const periodStartMs = Temporal.PlainDate.from({ year, month, day: 1 }).toZonedDateTime('UTC').epochMilliseconds
      return periodStartMs < minMs ? minMs : periodStartMs
    }).filter(ms => ms >= minMs && ms <= maxMs)
  }

  return undefined
}

export function createGanttChartOption(
  data: BasesData,
  options: GanttTransformerOptions,
): EChartsOption {
  const { taskProp, startProp, endProp, seriesProp } = options

  const validData: readonly GanttDataPoint[] = R.pipe(
    data,
    items => items.map((item, idx) => {
      const meta = extractRowMetadata(item, idx)
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

      const start = parseDateToEpochMs(startRaw)
      const end = parseDateToEpochMs(endRaw)

      const point: GanttDataPoint | null = (!task || start === null || end === null || end < start)
        ? null
        : {
            task,
            start,
            end,
            duration: end - start,
            seriesName,
            dataIndex: meta.rowIndex,
            ...(meta.filePath !== undefined ? { filePath: meta.filePath } : {}),
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

  const labelClearanceMs = axisRange ? (axisRange.max - axisRange.min) * 0.15 : 0
  const tasksWithMultipleBars = R.pipe(
    validData,
    R.groupBy(d => d.task),
  )

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
              itemStyle: { color: COLOR_TOKENS.chrome.transparent },
            }
      })

      const durationSeriesData = tasks.map((t) => {
        const item = dataMap[t]
        if (!item) {
          return '-'
        }
        const rowBars = tasksWithMultipleBars[t] ?? []
        const hasAdjacentRightBar = rowBars.some(
          other =>
            other.seriesName !== item.seriesName
            && other.end > item.end
            && other.start <= item.end + labelClearanceMs,
        )
        return {
          value: item.duration,
          start: item.start,
          end: item.end,
          seriesName: sName,
          rowIndex: item.dataIndex,
          ...(item.filePath !== undefined ? { filePath: item.filePath } : {}),
          ...(hasAdjacentRightBar ? { label: { show: false } } : {}),
        }
      })

      const stackId = `stack_${sName}`

      return [
        {
          name: '_start',
          type: 'bar',
          stack: stackId,
          itemStyle: {
            borderColor: COLOR_TOKENS.chrome.transparent,
            color: COLOR_TOKENS.chrome.transparent,
          },
          emphasis: {
            itemStyle: {
              borderColor: COLOR_TOKENS.chrome.transparent,
              color: COLOR_TOKENS.chrome.transparent,
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
            // 'inside' centers the label within the bar's own width -- for a
            // narrow or near-zero-duration bar (common for milestone-style
            // tasks) that forces the text to spill out both sides, straight
            // into the y-axis category label at the row's start. 'right'
            // anchors it just past the bar's end instead, so it grows into
            // open timeline space rather than back over the axis.
            position: 'right',
            formatter: p => (p.seriesName === 'Task' ? '' : (p.seriesName ?? '')),
          },
          // Narrow bars/tightly-packed rows can't always fit their task-name
          // label without it bleeding into a neighboring row -- hide whichever
          // label would collide instead of rendering illegible overlapping text.
          labelLayout: {
            hideOverlap: true,
          },
        },
      ]
    }),
  )

  const legendOption = getLegendOption(options)

  const minInterval = getTimeAxisMinInterval(options.xAxisFormat)
  const customTickValues = axisRange
    ? getTimeAxisCustomValues(axisRange.min, axisRange.max, options.xAxisFormat)
    : undefined

  return {
    tooltip: {
      trigger: 'item',
      formatter: asTooltipFormatter((params: GanttTooltipParam | ReadonlyArray<GanttTooltipParam>) => formatTooltip(params, options.valueFormat)),
    },
    // ECharts defaults to listing every series in the legend when `data`
    // isn't set explicitly — that would include the invisible '_start'
    // helper series (used to offset stacked bars), so pin `data` to the
    // real group names only.
    legend: legendOption && { ...legendOption, data: Object.keys(groupedData) },
    grid: {
      containLabel: true,
      left: '3%',
      // Wider than other charts' right margin: task-name labels now render
      // with position: 'right' (just past the bar's end, see the series
      // label above), so a task ending near the timeline's right edge needs
      // room for its label past the plot area, or it gets clipped by the
      // canvas boundary.
      right: '22%',
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
        // The tick value is always epoch-ms (a number). formatValue() would
        // route a number straight to numeric formatting and ignore date tokens
        // like 'MMM DD' or 'YYYY-[Q]Q', printing raw milliseconds; formatDateValue
        // parses the epoch-ms and applies the date pattern instead.
        formatter: (value: number) => options.xAxisFormat ? formatDateValue(value, options.xAxisFormat) : Temporal.Instant.fromEpochMilliseconds(value).toZonedDateTimeISO('UTC').toPlainDate().toString(),
        ...(customTickValues ? { customValues: [...customTickValues] } : {}),
      },
      ...(customTickValues ? { axisTick: { customValues: [...customTickValues] } } : {}),
      ...axisRange,
      ...(minInterval !== undefined ? { minInterval } : {}),
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
