import { describe, it, expect } from 'bun:test'
import { Temporal } from 'temporal-polyfill'
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
      'should unwrap Obsidian Value-wrapped date properties instead of dropping the task',
      () => {
        // Reproduces the Gantt-Chart.base bug: BasesNote#get() returns a
        // `Value` wrapper for date properties (e.g. { icon, date, time,
        // renderTo(), toString() -> '2023-10-01' }), not a raw string or
        // native Date. normalizeDate() didn't unwrap it, so every task's
        // start/end failed to parse and got filtered out (blank chart).
        const wrappedDate = (iso: string) => ({
          icon: 'lucide-calendar',
          time: false,
          renderTo: () => undefined,
          toString: () => iso,
        })

        const wrappedData = [
          { task: 'Planning',
            start: wrappedDate('2023-10-01'),
            end: wrappedDate('2023-10-05') },
        ]

        const option = createGanttChartOption(
          wrappedData,
          {
            taskProp: 'task',
            startProp: 'start',
            endProp: 'end',
          },
        )

        const yAxis = option.yAxis as { data?: string[] }
        expect(yAxis.data).toContain('Planning')
      },
    )

    it(
      'should pin the time axis to the actual task window, not the stacked-from-epoch range',
      () => {
        // Regression: the invisible '_start' series stacks bar values from 0,
        // so ECharts' default time-axis auto-range spanned [epoch, max end]
        // (decades) instead of the real task window (days).
        const option = createGanttChartOption(
          data,
          {
            taskProp: 'task',
            startProp: 'start',
            endProp: 'end',
          },
        )

        const xAxis = option.xAxis as { min?: number, max?: number }
        expect(xAxis.min).toBe(Temporal.PlainDate.from('2023-01-01').toZonedDateTime('UTC').epochMilliseconds)
        expect(xAxis.max).toBe(Temporal.PlainDate.from('2023-01-10').toZonedDateTime('UTC').epochMilliseconds)
      },
    )

    it(
      'should use a value axis (not time) so stacked bars actually render, formatting ticks as dates',
      () => {
        // Regression: ECharts fails to position stacked bars against a
        // 'time'-type axis at all (bars silently disappear) even though the
        // same numeric values render correctly on a 'value'-type axis —
        // verified empirically against a live chart instance. Epoch ms are
        // plain numbers, so 'value' + an axisLabel formatter gets both a
        // working chart and human-readable date ticks.
        const option = createGanttChartOption(
          data,
          {
            taskProp: 'task',
            startProp: 'start',
            endProp: 'end',
          },
        )

        const xAxis = option.xAxis as { type?: string, axisLabel?: { formatter?: (value: number) => string } }
        expect(xAxis.type).toBe('value')

        const formatted = xAxis.axisLabel?.formatter?.(
          Temporal.PlainDate.from('2023-01-01').toZonedDateTime('UTC').epochMilliseconds,
        )
        expect(formatted).toBe('2023-01-01')
      },
    )

    it(
      'should exclude the invisible _start series from the legend',
      () => {
        // Regression (fs4.11): ECharts lists every series in the legend when
        // `legend.data` isn't set explicitly, so the invisible '_start'
        // helper series (used to offset stacked bars) leaked into it as a
        // raw internal name.
        const groupedData = [
          { task: 'Task 1',
            start: '2023-01-01',
            end: '2023-01-05',
            type: 'Dev' },
          { task: 'Task 2',
            start: '2023-01-02',
            end: '2023-01-08',
            type: 'Test' },
        ]

        const option = createGanttChartOption(
          groupedData,
          {
            taskProp: 'task',
            startProp: 'start',
            endProp: 'end',
            seriesProp: 'type',
            legend: true,
          },
        )

        const legend = option.legend as { data?: string[] }
        expect(legend.data).toEqual(['Dev', 'Test'])
        expect(legend.data).not.toContain('_start')
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
