import { describe, expect, test } from 'bun:test'
import { createCartesianChartOption } from '../../../src/charts/transformers/cartesian'
import { createGanttChartOption } from '../../../src/charts/transformers/gantt'
import type { BasesData } from '../../../src/charts/transformers/base'
import * as R from 'remeda'

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

    const yAxisObj = opt.yAxis as { readonly axisLabel?: { readonly formatter?: (val: number) => string } }
    expect(yAxisObj.axisLabel?.formatter).toBeDefined()
    expect(yAxisObj.axisLabel?.formatter?.(100_000)).toBe('$100,000.00')
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

    const xAxisObj = opt.xAxis as { readonly axisLabel?: { readonly formatter?: (val: string) => string } }
    expect(xAxisObj.axisLabel?.formatter?.('2024-01-15T00:00:00Z')).toBe('2024-01-15')
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

    const parsedOverride = JSON.parse(rawOverride) as Record<string, unknown>
    const merged = R.mergeDeep(baseOpt as Record<string, unknown>, parsedOverride) as { readonly title?: { readonly text?: string }, readonly grid?: { readonly bottom?: number } }

    expect(merged.title?.text).toBe('Custom Department Spend')
    expect(merged.grid?.bottom).toBe(80)
  })
})
