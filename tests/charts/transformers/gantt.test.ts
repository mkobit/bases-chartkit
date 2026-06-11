import { describe, it, expect } from 'bun:test'
import { createGanttChartOption } from '../../../src/charts/transformers/gantt'
import type { BarSeriesOption } from 'echarts'

describe(
  'createGanttChartOption',
  () => {
    const data = [
      { task: 'Task 1',
        start: '2023-01-01',
        end: '2023-01-05' },
      { task: 'Task 2',
        start: '2023-01-06',
        end: '2023-01-10' },
      { task: 'Task 3',
        start: '2023-01-02',
        end: '2023-01-08' },
      { task: 'Invalid',
        start: null,
        end: '2023-01-05' },
      { task: 'Negative',
        start: '2023-01-10',
        end: '2023-01-05' }, // End before start
    ]

    it(
      'should create basic gantt chart option',
      () => {
        const option = createGanttChartOption(
          data,
          {
            taskProp: 'task',
            startProp: 'start',
            endProp: 'end',
          },
        )

        expect(option.series).toBeDefined()
        // Should have 2 series (start + duration) for the default group
        expect(option.series).toHaveLength(2)

        const series = option.series as BarSeriesOption[]
        const startSeries = series[0]
        const durationSeries = series[1]

        // @ts-expect-error - suppress strictNullChecks/type errors
        expect(startSeries.name).toBe('_start')
        // @ts-expect-error - suppress strictNullChecks/type errors
        expect(startSeries.stack).toBeDefined()
        // @ts-expect-error - suppress strictNullChecks/type errors
        expect(startSeries.itemStyle?.color).toBe('transparent')

        // Data length should match number of valid tasks (3)
        // Task 1, Task 2, Task 3. Invalid and Negative should be filtered.
        // @ts-expect-error - suppress strictNullChecks/type errors
        expect(startSeries.data).toHaveLength(3)

        // @ts-expect-error - suppress strictNullChecks/type errors
        expect(durationSeries.stack).toBe(startSeries.stack)
      },
    )

    it(
      'should handle grouping via seriesProp',
      () => {
        const groupedData = [
          { task: 'Task 1',
            start: '2023-01-01',
            end: '2023-01-05',
            type: 'Dev' },
          { task: 'Task 1',
            start: '2023-01-06',
            end: '2023-01-10',
            type: 'Test' }, // Same task, different phase
          { task: 'Task 2',
            start: '2023-01-02',
            end: '2023-01-08',
            type: 'Dev' },
        ]

        const option = createGanttChartOption(
          groupedData,
          {
            taskProp: 'task',
            startProp: 'start',
            endProp: 'end',
            seriesProp: 'type',
          },
        )

        // 2 groups (Dev, Test) -> 2 * 2 series = 4 series
        expect(option.series).toHaveLength(4)

        const series = option.series as BarSeriesOption[]
        const names = series.map(s => s.name)

        expect(names).toContain('Dev')
        expect(names).toContain('Test')
        expect(names.filter(n => n === '_start')).toHaveLength(2)
      },
    )

    it(
      'should calculate duration correctly',
      () => {
        const option = createGanttChartOption(
          data,
          {
            taskProp: 'task',
            startProp: 'start',
            endProp: 'end',
          },
        )

        const series = option.series as BarSeriesOption[]
        const durationSeries = series[1]

        // Task 1: 01-01 to 01-05 = 4 days difference in ms?
        // Wait, 01-05 usually means start of day.
        // 2023-01-05 - 2023-01-01 = 4 * 24 * 3600 * 1000

        // @ts-expect-error - suppress strictNullChecks/type errors
        const data0 = (durationSeries.data as { value?: number, itemStyle?: unknown }[])[0]

        expect(data0?.value).toBeGreaterThan(0)

        // 4 days in ms

        expect(data0?.value).toBe(4 * 24 * 60 * 60 * 1000)
      },
    )

    it(
      'should filter invalid data',
      () => {
        const option = createGanttChartOption(
          data,
          {
            taskProp: 'task',
            startProp: 'start',
            endProp: 'end',
          },
        )

        const yAxis = option.yAxis as { data?: string[] }

        expect(yAxis.data).not.toContain('Invalid')

        expect(yAxis.data).not.toContain('Negative')
      },
    )
  },
)
