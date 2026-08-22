import { describe, it, expect } from 'bun:test'
import type { EChartsOption } from 'echarts'
import { transformDataToChartOption } from '../src/charts/transformer'
import { isRecord } from '../src/charts/transformers/bases-values'

// The dispatch layer (`transformDataToChartOption`) routes a `chartType`
// string to its per-chart transformer, then folds in an optional shared
// title/description. The per-chart transformers each have their own unit
// tests that call the `create*ChartOption` functions directly, which never
// exercises the dispatch lambdas here — these tests drive every route through
// the public entrypoint instead, plus the unknown-type fallback and the
// default-argument path.

// Read series entries off the wide ECharts option union without casts:
// `series` is `SeriesOption | SeriesOption[] | undefined`.
const seriesEntries = (option: EChartsOption): readonly unknown[] => {
  const series = option.series
  if (Array.isArray(series)) {
    return series
  }
  return series === undefined ? [] : [series]
}

const seriesTypeAt = (option: EChartsOption, index: number): string | undefined => {
  const entry = seriesEntries(option)[index]
  return isRecord(entry) && typeof entry.type === 'string' ? entry.type : undefined
}

const seriesTypes = (option: EChartsOption): readonly (string | undefined)[] =>
  seriesEntries(option).map((_, index) => seriesTypeAt(option, index))

describe(
  'transformDataToChartOption dispatch',
  () => {
    const cartesianData = [
      { cat: 'A',
        val: 10 },
      { cat: 'B',
        val: 20 },
    ]

    it(
      'routes "bar" to a cartesian bar series',
      () => {
        const option = transformDataToChartOption(cartesianData, 'cat', 'val', 'bar')
        expect(seriesTypeAt(option, 0)).toBe('bar')
      },
    )

    it(
      'routes "line" to a cartesian line series',
      () => {
        const option = transformDataToChartOption(cartesianData, 'cat', 'val', 'line')
        expect(seriesTypeAt(option, 0)).toBe('line')
      },
    )

    it(
      'defaults to a bar chart when chartType is omitted',
      () => {
        const option = transformDataToChartOption(cartesianData, 'cat', 'val')
        expect(seriesTypeAt(option, 0)).toBe('bar')
      },
    )

    it(
      'falls back to a cartesian bar chart for an unknown chart type',
      () => {
        // @ts-expect-error -- deliberately pass a chartType outside the union
        // to exercise the transformerMap-miss fallback branch.
        const option = transformDataToChartOption(cartesianData, 'cat', 'val', 'notARealChart')
        expect(seriesTypeAt(option, 0)).toBe('bar')
      },
    )

    it(
      'routes "lines" to a lines series',
      () => {
        const data = [
          { startX: 10,
            startY: 10,
            endX: 20,
            endY: 20,
            group: 'A' },
          { startX: 20,
            startY: 20,
            endX: 30,
            endY: 30,
            group: 'A' },
        ]
        const option = transformDataToChartOption(
          data,
          'startX',
          'startY',
          'lines',
          { x2Prop: 'endX',
            y2Prop: 'endY',
            seriesProp: 'group' },
        )
        expect(seriesTypeAt(option, 0)).toBe('lines')
      },
    )

    it(
      'routes "radar" to a radar series',
      () => {
        const data = [
          { Name: 'Hero 0',
            Strength: 51,
            Intelligence: 93,
            Agility: 35 },
          { Name: 'Hero 1',
            Strength: 23,
            Intelligence: 40,
            Agility: 56 },
        ]
        const option = transformDataToChartOption(
          data,
          'Name',
          '',
          'radar',
          { metricProps: ['Strength',
            'Intelligence',
            'Agility'] },
        )
        expect(option.radar).toBeDefined()
        expect(seriesTypeAt(option, 0)).toBe('radar')
      },
    )

    it(
      'routes "bubble" to a scatter series',
      () => {
        const option = transformDataToChartOption(cartesianData, 'cat', 'val', 'bubble')
        expect(seriesTypeAt(option, 0)).toBe('scatter')
      },
    )

    it(
      'routes "effectScatter" to an effectScatter series',
      () => {
        const data = [
          { category: 'A',
            value: 10,
            series: 'S1' },
          { category: 'B',
            value: 20,
            series: 'S1' },
        ]
        const option = transformDataToChartOption(
          data,
          'category',
          'value',
          'effectScatter',
          { seriesProp: 'series' },
        )
        expect(seriesTypeAt(option, 0)).toBe('effectScatter')
      },
    )

    it(
      'routes "themeRiver" to a themeRiver series',
      () => {
        const data = [
          { date: '2023-01-01',
            mentions: 10,
            topic: 'Tech' },
          { date: '2023-01-02',
            mentions: 8,
            topic: 'Tech' },
        ]
        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'themeRiver',
          { valueProp: 'mentions',
            themeProp: 'topic' },
        )
        expect(seriesTypeAt(option, 0)).toBe('themeRiver')
      },
    )

    it(
      'routes "pictorialBar" to a pictorialBar series',
      () => {
        const data = [
          { category: 'A',
            value: 10 },
          { category: 'B',
            value: 20 },
        ]
        const option = transformDataToChartOption(data, 'category', 'value', 'pictorialBar')
        expect(seriesTypeAt(option, 0)).toBe('pictorialBar')
      },
    )

    it(
      'routes "gantt" to a chart with bar series',
      () => {
        const data = [
          { task: 'Task 1',
            start: '2023-01-01',
            end: '2023-01-05' },
          { task: 'Task 2',
            start: '2023-01-06',
            end: '2023-01-10' },
        ]
        const option = transformDataToChartOption(
          data,
          '',
          '',
          'gantt',
          { taskProp: 'task',
            startProp: 'start',
            endProp: 'end' },
        )
        expect(seriesTypes(option)).toContain('bar')
      },
    )

    it(
      'routes "pareto" to combined bar and line series',
      () => {
        const data = [
          { category: 'A',
            value: 30 },
          { category: 'B',
            value: 50 },
          { category: 'C',
            value: 20 },
        ]
        const option = transformDataToChartOption(data, 'category', 'value', 'pareto')
        const types = seriesTypes(option)
        expect(types).toContain('bar')
        expect(types).toContain('line')
      },
    )

    it(
      'routes "histogram" to a bar series',
      () => {
        const data = [
          { value: 1 },
          { value: 2 },
          { value: 2 },
          { value: 3 },
          { value: 10 },
        ]
        const option = transformDataToChartOption(data, '', 'value', 'histogram')
        expect(seriesTypeAt(option, 0)).toBe('bar')
      },
    )

    it(
      'routes "bullet" to a bar-and-scatter chart',
      () => {
        const data = [
          { category: 'A',
            value: 10,
            target: 12,
            low: 5,
            mid: 15,
            high: 20 },
          { category: 'B',
            value: 20,
            target: 18,
            low: 10,
            mid: 25,
            high: 30 },
        ]
        const option = transformDataToChartOption(
          data,
          'category',
          'value',
          'bullet',
          { targetProp: 'target' },
        )
        const types = seriesTypes(option)
        expect(types).toContain('bar')
        expect(types).toContain('scatter')
      },
    )

    it(
      'routes "radialBar" to a polar bar chart',
      () => {
        const data = [
          { category: 'A',
            value: 10 },
          { category: 'B',
            value: 20 },
          { category: 'C',
            value: 30 },
        ]
        const option = transformDataToChartOption(data, 'category', 'value', 'radialBar')
        expect(option.polar).toBeDefined()
        expect(seriesTypeAt(option, 0)).toBe('bar')
      },
    )

    it(
      'routes "polarScatter" to a polar scatter chart',
      () => {
        const data = [
          { angle: 'A',
            radius: 10 },
          { angle: 'B',
            radius: 20 },
        ]
        const option = transformDataToChartOption(data, 'angle', 'radius', 'polarScatter')
        expect(option.polar).toBeDefined()
        expect(seriesTypeAt(option, 0)).toBe('scatter')
      },
    )
  },
)

describe(
  'transformDataToChartOption title folding',
  () => {
    const data = [
      { cat: 'A',
        val: 10 },
      { cat: 'B',
        val: 20 },
    ]

    it(
      'adds a title when the chart has none and a title option is supplied',
      () => {
        const option = transformDataToChartOption(
          data,
          'cat',
          'val',
          'bar',
          { title: 'My chart' },
        )
        const { title } = option
        expect(isRecord(title)).toBe(true)
        if (!isRecord(title)) {
          return
        }
        expect(title.text).toBe('My chart')
      },
    )

    it(
      'preserves a transformer-provided title text while folding in the description as subtext',
      () => {
        // The parallel transformer emits its own `{ title: { text: 'No
        // dimensions specified' } }` when no dimensions are given. The
        // dispatch layer must keep that non-empty text and merge the shared
        // description in as subtext, rather than overwriting it.
        const option = transformDataToChartOption(
          [],
          '',
          '',
          'parallel',
          { title: 'Ignored because transformer set its own',
            description: 'Extra context' },
        )
        const { title } = option
        expect(isRecord(title)).toBe(true)
        if (!isRecord(title)) {
          return
        }
        expect(title.text).toBe('No dimensions specified')
        expect(title.subtext).toBe('Extra context')
      },
    )
  },
)
