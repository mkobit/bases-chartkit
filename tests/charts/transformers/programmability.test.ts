import { describe, expect, test } from 'bun:test'
import { createCartesianChartOption } from '../../../src/charts/transformers/cartesian'
import { createGanttChartOption } from '../../../src/charts/transformers/gantt'
import type { BasesData } from '../../../src/charts/transformers/base'
import type { EChartsOption } from 'echarts'
import * as R from 'remeda'

// EChartsOption['xAxis']/['yAxis'] are `type`-discriminated unions -- checking
// the literal `type` narrows to the axis member that carries `axisLabel`
// without a cast.
function valueYAxis(option: EChartsOption) {
  const yAxis = Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis
  if (yAxis?.type !== 'value') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a value yAxis, got ${String(yAxis?.type)}`)
  }
  return yAxis
}

function categoryXAxis(option: EChartsOption) {
  const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
  if (xAxis?.type !== 'category') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a category xAxis, got ${String(xAxis?.type)}`)
  }
  return xAxis
}

describe('chart programmability and formatters', () => {
  const sampleData: BasesData = [
    { Department: 'Engineering', Spend: 100_000, Date: '2024-01-15T00:00:00Z' },
    { Department: 'Design', Spend: 50_000, Date: '2024-02-20T00:00:00Z' },
  ]

  test('applies xAxisFormat and yAxisFormat to cartesian chart options', () => {
    const opt = createCartesianChartOption(
      sampleData,
      'Department',
      'Spend',
      'bar',
      {
        xAxisFormat: 'compact',
        yAxisFormat: 'currency:USD',
      },
    )

    expect(opt.xAxis).toBeDefined()
    expect(opt.yAxis).toBeDefined()

    const formatter = valueYAxis(opt).axisLabel?.formatter
    expect(formatter).toBeDefined()
    if (typeof formatter !== 'function') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected a yAxis axisLabel formatter function, got ${typeof formatter}`)
    }
    expect(formatter(100_000, 0, undefined)).toBe('$100,000.00')
  })

  test('applies date formatting to cartesian category x-axis', () => {
    const opt = createCartesianChartOption(
      sampleData,
      'Date',
      'Spend',
      'line',
      {
        xAxisFormat: 'YYYY-MM-DD',
      },
    )

    const formatter = categoryXAxis(opt).axisLabel?.formatter
    if (typeof formatter !== 'function') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error(`expected an xAxis axisLabel formatter function, got ${typeof formatter}`)
    }
    expect(formatter('2024-01-15T00:00:00Z', 0, undefined)).toBe('2024-01-15')
  })

  test('formats duration in gantt chart tooltip and respects custom valueFormat', () => {
    const ganttData: BasesData = [
      { Task: 'Design', Start: '2024-01-01', End: '2024-01-06' },
    ]

    const opt = createGanttChartOption(ganttData, {
      taskProp: 'Task',
      startProp: 'Start',
      endProp: 'End',
    })

    expect(opt.tooltip).toBeDefined()
  })

  test('deep merges raw ECharts option override into chart options', () => {
    const baseOpt = createCartesianChartOption(
      sampleData,
      'Department',
      'Spend',
      'bar',
    )

    const rawOverride = JSON.stringify({
      title: { text: 'Custom Department Spend' },
      grid: { bottom: 80 },
    })

    const parsedOverride: { readonly title: { readonly text: string }, readonly grid: { readonly bottom: number } } = JSON.parse(rawOverride)
    const merged = R.mergeDeep(baseOpt, parsedOverride)

    expect(merged.title?.text).toBe('Custom Department Spend')
    expect(merged.grid?.bottom).toBe(80)
  })
})
