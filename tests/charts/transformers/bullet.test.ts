import { describe, it, expect } from 'bun:test'
import { createBulletChartOption } from '../../../src/charts/transformers/bullet'
import type { BarSeriesOption, ScatterSeriesOption, DatasetComponentOption } from 'echarts'

const isBarSeriesOption = (value: unknown): value is BarSeriesOption =>
  typeof value === 'object' && value !== null && 'type' in value && value.type === 'bar'

const isScatterSeriesOption = (value: unknown): value is ScatterSeriesOption =>
  typeof value === 'object' && value !== null && 'type' in value && value.type === 'scatter'

const isDatasetComponentOption = (value: unknown): value is DatasetComponentOption =>
  typeof value === 'object' && value !== null && 'source' in value

interface BulletDatasetRow {
  readonly r1: number
  readonly r2: number
  readonly r3: number
}

const isBulletDatasetRow = (value: unknown): value is BulletDatasetRow =>
  typeof value === 'object' && value !== null && 'r1' in value && 'r2' in value && 'r3' in value

describe(
  'createBulletChartOption',
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
      { category: 'C',
        value: 15 }, // Missing target and ranges
      { category: 'D',
        value: null,
        target: 10 },
    ]

    it(
      'should create a bullet chart with bar and scatter series',
      () => {
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          { targetProp: 'target' },
        )

        const series = Array.isArray(option.series) ? option.series : []
        expect(series).toHaveLength(2)

        const barSeries = series.find(isBarSeriesOption)
        const scatterSeries = series.find(isScatterSeriesOption)
        expect(barSeries).toBeDefined()
        expect(scatterSeries).toBeDefined()

        expect(barSeries?.type).toBe('bar')
        expect(barSeries?.encode).toEqual({ x: 'x',
          y: 'y' })
        expect(barSeries?.barWidth).toBe('60%')

        expect(scatterSeries?.type).toBe('scatter')
        expect(scatterSeries?.encode).toEqual({ x: 'x',
          y: 't' })
        expect(scatterSeries?.symbol).toBe('rect')
        expect(scatterSeries?.symbolSize).toEqual([40,
          4]) // Default vertical bar, horizontal marker
      },
    )

    it(
      'should create range series when range props are provided',
      () => {
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          {
            targetProp: 'target',
            rangeLowProp: 'low',
            rangeMidProp: 'mid',
            rangeHighProp: 'high',
          },
        )

        const series = Array.isArray(option.series) ? option.series : []
        expect(series).toHaveLength(5) // 3 ranges + 1 measure + 1 target

        // Construction order in bullet.ts is [...rangeSeries, barSeries, ...] --
        // range1, range2, range3, then the measure bar.
        const bars = series.filter(isBarSeriesOption)
        expect(bars).toHaveLength(4)
        const [range1, range2, range3, measure] = bars

        expect(range1).toBeDefined()
        expect(range1?.stack).toBe('range')
        expect(range1?.z).toBe(0)
        expect(range1?.itemStyle?.color).toBe('#e0e0e0')
        expect(range1?.encode).toEqual({ x: 'x',
          y: 'r1' })

        expect(range2).toBeDefined()
        expect(range2?.stack).toBe('range')
        expect(range2?.z).toBe(0)
        expect(range2?.itemStyle?.color).toBe('#bdbdbd')
        expect(range2?.encode).toEqual({ x: 'x',
          y: 'r2' })

        expect(range3).toBeDefined()
        expect(range3?.stack).toBe('range')
        expect(range3?.z).toBe(0)
        expect(range3?.itemStyle?.color).toBe('#9e9e9e')
        expect(range3?.encode).toEqual({ x: 'x',
          y: 'r3' })

        expect(measure).toBeDefined()
        expect(measure?.z).toBe(2)
        expect(measure?.barGap).toBe('-100%')
        expect(measure?.barWidth).toBe('40%')
      },
    )

    it(
      'should calculate range deltas correctly',
      () => {
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          {
            rangeLowProp: 'low',
            rangeMidProp: 'mid',
            rangeHighProp: 'high',
          },
        )

        const datasets = Array.isArray(option.dataset) ? option.dataset : []
        const firstDataset = datasets.find(isDatasetComponentOption)
        expect(firstDataset).toBeDefined()

        const source = firstDataset?.source
        const rows = Array.isArray(source) ? source.filter(isBulletDatasetRow) : []
        const rowA = rows[0]
        expect(rowA).toBeDefined()

        // A: low=5, mid=15, high=20
        // r1=5, r2=10 (15-5), r3=5 (20-15)
        expect(rowA).toEqual(expect.objectContaining({
          r1: 5,
          r2: 10,
          r3: 5,
        }))
      },
    )

    it(
      'should use yAxisLabel as the measure series name instead of the raw prop key',
      () => {
        // Regression (fs4.11): bullet uses VALUE_PROP_KEY (not
        // Y_AXIS_PROP_KEY), so the view's common-options helper never
        // resolved a display name for it, and the series name always fell
        // back to the raw property path (e.g. 'note.Value' instead of
        // 'Value').
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          { yAxisLabel: 'Value' },
        )

        const series = Array.isArray(option.series) ? option.series : []
        const measure = series.find(isBarSeriesOption)
        expect(measure).toBeDefined()
        expect(measure?.name).toBe('Value')
      },
    )

    it(
      'should fall back to the raw prop key when yAxisLabel is not provided',
      () => {
        const option = createBulletChartOption(
          data,
          'category',
          'value',
        )

        const series = Array.isArray(option.series) ? option.series : []
        const measure = series.find(isBarSeriesOption)
        expect(measure).toBeDefined()
        expect(measure?.name).toBe('value')
      },
    )

    it(
      'should use targetLabel as the target series name instead of the raw prop key',
      () => {
        // Same class of bug as the yAxisLabel regression above, but for the
        // target marker series: bullet-chart-view.ts previously passed
        // targetProp straight through as the series `name` with no display
        // -name resolution, so tooltips showed the raw property path (e.g.
        // 'note.Target') instead of a friendly label.
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          { targetProp: 'target', targetLabel: 'Target' },
        )

        const series = Array.isArray(option.series) ? option.series : []
        const target = series.find(isScatterSeriesOption)
        expect(target).toBeDefined()
        expect(target?.name).toBe('Target')
      },
    )

    it(
      'should fall back to a literal "Target" when targetLabel is not provided',
      () => {
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          { targetProp: 'target' },
        )

        const series = Array.isArray(option.series) ? option.series : []
        const target = series.find(isScatterSeriesOption)
        expect(target).toBeDefined()
        expect(target?.name).toBe('Target')
        expect(target?.name).not.toBe('target')
      },
    )

    it(
      'should use light-mode range colors and a black target marker by default',
      () => {
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          {
            targetProp: 'target',
            rangeLowProp: 'low',
            rangeMidProp: 'mid',
            rangeHighProp: 'high',
          },
        )

        const series = Array.isArray(option.series) ? option.series : []
        const bars = series.filter(isBarSeriesOption)
        const [range1, range2, range3] = bars
        expect(range1?.itemStyle?.color).toBe('#e0e0e0')
        expect(range2?.itemStyle?.color).toBe('#bdbdbd')
        expect(range3?.itemStyle?.color).toBe('#9e9e9e')

        const target = series.find(isScatterSeriesOption)
        expect(target?.itemStyle?.color).toBe('#000')
      },
    )

    it(
      'should use dark-mode range colors and a white target marker when isDarkMode is true',
      () => {
        // Regression (bck-gz6.1): hardcoded light-gray bands and a black
        // target marker rendered as a stark light box on a near-black
        // background in dark mode.
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          {
            targetProp: 'target',
            rangeLowProp: 'low',
            rangeMidProp: 'mid',
            rangeHighProp: 'high',
            isDarkMode: true,
          },
        )

        const series = Array.isArray(option.series) ? option.series : []
        const bars = series.filter(isBarSeriesOption)
        const [range1, range2, range3] = bars
        expect(range1?.itemStyle?.color).toBe('#404040')
        expect(range2?.itemStyle?.color).toBe('#595959')
        expect(range3?.itemStyle?.color).toBe('#737373')

        const target = series.find(isScatterSeriesOption)
        expect(target?.itemStyle?.color).toBe('#fff')
      },
    )

    it(
      'should handle flipped axis with ranges',
      () => {
        const option = createBulletChartOption(
          data,
          'category',
          'value',
          {
            targetProp: 'target',
            flipAxis: true,
            rangeLowProp: 'low',
          },
        )

        // hasRanges = Boolean(rangeLowProp || rangeMidProp || rangeHighProp),
        // so rangeLowProp alone still creates all 3 range series (empty deltas
        // for the unset mid/high thresholds) + 1 measure + 1 target.
        const series = Array.isArray(option.series) ? option.series : []
        expect(series).toHaveLength(5)

        const bars = series.filter(isBarSeriesOption)
        const [r1, , , measure] = bars
        const target = series.find(isScatterSeriesOption)

        expect(r1).toBeDefined()
        expect(r1?.encode).toEqual({ x: 'r1',
          y: 'x' })

        expect(measure).toBeDefined()
        expect(measure?.encode).toEqual({ x: 'y',
          y: 'x' })

        expect(target).toBeDefined()
        expect(target?.symbolSize).toEqual([4,
          30]) // Horizontal bar, vertical marker
      },
    )
  },
)
