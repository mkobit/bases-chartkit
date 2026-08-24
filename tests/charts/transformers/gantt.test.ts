import { describe, it, expect } from 'bun:test'
import { createGanttChartOption } from '../../../src/charts/transformers/gantt'
import type { BarSeriesOption, EChartsOption } from 'echarts'

interface GanttDurationDatum {
  readonly value: number
}

function isGanttDurationDatum(value: unknown): value is GanttDurationDatum {
  return typeof value === 'object' && value !== null && 'value' in value && typeof value.value === 'number'
}

// EChartsOption['series'] is a `type`-discriminated union, so checking the
// literal `type` narrows each entry to BarSeriesOption -- no cast needed.
function barSeriesList(option: EChartsOption): readonly BarSeriesOption[] {
  const series = option.series
  const list = Array.isArray(series) ? series : series ? [series] : []
  return list.flatMap(s => s.type === 'bar' ? [s] : [])
}

// EChartsOption['xAxis']/['yAxis'] are `type`-discriminated unions -- gantt.ts
// always sets a 'value' xAxis and a 'category' yAxis, so these check the real
// discriminant (which also unlocks `.min`/`.max`/`.data`) rather than asserting.
function valueXAxis(option: EChartsOption) {
  const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
  if (xAxis?.type !== 'value') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a value xAxis, got ${String(xAxis?.type)}`)
  }
  return xAxis
}

function categoryYAxis(option: EChartsOption) {
  const yAxis = Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis
  if (yAxis?.type !== 'category') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a category yAxis, got ${String(yAxis?.type)}`)
  }
  return yAxis
}

// A value axis label formatter is `AxisLabelValueFormatter | string`; the
// typeof-function check narrows off the string form so it can be called.
function xAxisFormatter(option: EChartsOption) {
  const formatter = valueXAxis(option).axisLabel?.formatter
  if (typeof formatter !== 'function') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected an xAxis axisLabel formatter function, got ${typeof formatter}`)
  }
  return formatter
}

function legendComponent(option: EChartsOption) {
  const legend = Array.isArray(option.legend) ? option.legend[0] : option.legend
  if (!legend) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error('expected a legend component')
  }
  return legend
}

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

        const series = barSeriesList(option)
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

        const series = barSeriesList(option)
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

        const series = barSeriesList(option)
        const durationSeries = series[1]

        // Task 1: 01-01 to 01-05 = 4 days difference in ms?
        // Wait, 01-05 usually means start of day.
        // 2023-01-05 - 2023-01-01 = 4 * 24 * 3600 * 1000

        const rawData = durationSeries?.data
        const data0 = (Array.isArray(rawData) ? rawData.flatMap(row => isGanttDurationDatum(row) ? [row] : []) : [])[0]

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

        const yAxis = categoryYAxis(option)
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

        const xAxis = valueXAxis(option)
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

        const xAxis = valueXAxis(option)
        expect(xAxis.type).toBe('value')

        const formatted = xAxisFormatter(option)(
          Temporal.PlainDate.from('2023-01-01').toZonedDateTime('UTC').epochMilliseconds,
          0,
          undefined,
        )
        expect(formatted).toBe('2023-01-01')
      },
    )

    it(
      'should format time-axis ticks with a date pattern when xAxisFormat is set',
      () => {
        // Regression: the tick value is epoch-ms (a number), and the old
        // formatter routed it through formatValue(), which treats numbers as
        // numeric and ignores date tokens -- so 'MMM DD' / 'YYYY-[Q]Q' printed
        // raw milliseconds. It must parse the epoch-ms and apply the pattern.
        const option = createGanttChartOption(
          data,
          {
            taskProp: 'task',
            startProp: 'start',
            endProp: 'end',
            xAxisFormat: 'YYYY-[Q]Q',
          },
        )

        const epochMs = Temporal.PlainDate.from('2023-01-01').toZonedDateTime('UTC').epochMilliseconds
        const formatted = xAxisFormatter(option)(epochMs, 0, undefined)

        expect(formatted).toBe('2023-Q1')
      },
    )

    it(
      'should format time-axis ticks with month/day tokens when xAxisFormat is set',
      () => {
        const option = createGanttChartOption(
          data,
          {
            taskProp: 'task',
            startProp: 'start',
            endProp: 'end',
            xAxisFormat: 'MMM DD',
          },
        )

        const epochMs = Temporal.PlainDate.from('2023-03-05').toZonedDateTime('UTC').epochMilliseconds
        const formatted = xAxisFormatter(option)(epochMs, 0, undefined)

        expect(formatted).toBe('Mar 05')
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

        const legend = legendComponent(option)
        expect(legend.data).toEqual(['Dev', 'Test'])
        expect(legend.data).not.toContain('_start')
      },
    )

    it(
      'should hide overlapping task-bar labels instead of letting them collide with an adjacent row',
      () => {
        const option = createGanttChartOption(
          data,
          {
            taskProp: 'task',
            startProp: 'start',
            endProp: 'end',
          },
        )

        const series = barSeriesList(option)
        const durationSeries = series[1]

        // @ts-expect-error - suppress strictNullChecks/type errors
        expect(durationSeries.labelLayout?.hideOverlap).toBe(true)
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

        const yAxis = categoryYAxis(option)

        expect(yAxis.data).not.toContain('Invalid')

        expect(yAxis.data).not.toContain('Negative')
      },
    )
  },
)
