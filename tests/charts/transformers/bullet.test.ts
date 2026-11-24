import { describe, it, expect } from 'bun:test'
import * as echarts from 'echarts'
import { createBulletChartOption } from '../../../src/charts/transformers/bullet'
import type { BarSeriesOption, CustomSeriesOption, DatasetComponentOption } from 'echarts'

const isBarSeriesOption = (value: unknown): value is BarSeriesOption =>
  typeof value === 'object' && value !== null && 'type' in value && value.type === 'bar'

const isCustomSeriesOption = (value: unknown): value is CustomSeriesOption =>
  typeof value === 'object' && value !== null && 'type' in value && value.type === 'custom'

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
      'should create a bullet chart with bar and custom target series',
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
        const targetSeries = series.find(isCustomSeriesOption)
        expect(barSeries).toBeDefined()
        expect(targetSeries).toBeDefined()

        expect(barSeries?.type).toBe('bar')
        expect(barSeries?.encode).toEqual({ x: 'x',
          y: 'y' })
        expect(barSeries?.barWidth).toBe('60%')

        expect(targetSeries?.type).toBe('custom')
        expect(targetSeries?.encode).toEqual({ x: 'x',
          y: 't' })
        expect(targetSeries?.color).toBe('#000')
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
        expect(range1?.xAxisIndex).toBe(1)
        expect(range1?.z).toBe(0)
        expect(range1?.itemStyle?.color).toBe('#e0e0e0')
        expect(range1?.encode).toEqual({ x: 'x',
          y: 'r1' })

        expect(range2).toBeDefined()
        expect(range2?.stack).toBe('range')
        expect(range2?.xAxisIndex).toBe(1)
        expect(range2?.z).toBe(0)
        expect(range2?.itemStyle?.color).toBe('#bdbdbd')
        expect(range2?.encode).toEqual({ x: 'x',
          y: 'r2' })

        expect(range3).toBeDefined()
        expect(range3?.stack).toBe('range')
        expect(range3?.xAxisIndex).toBe(1)
        expect(range3?.z).toBe(0)
        expect(range3?.itemStyle?.color).toBe('#9e9e9e')
        expect(range3?.encode).toEqual({ x: 'x',
          y: 'r3' })

        expect(measure).toBeDefined()
        expect(measure?.z).toBe(2)
        expect(measure?.xAxisIndex).toBe(0)
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
        const target = series.find(isCustomSeriesOption)
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
        const target = series.find(isCustomSeriesOption)
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

        const target = series.find(isCustomSeriesOption)
        expect(target?.color).toBe('#000')
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

        const target = series.find(isCustomSeriesOption)
        expect(target?.color).toBe('#fff')
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
        const target = series.find(isCustomSeriesOption)

        expect(r1).toBeDefined()
        expect(r1?.yAxisIndex).toBe(1)
        expect(r1?.encode).toEqual({ x: 'r1',
          y: 'x' })

        expect(measure).toBeDefined()
        expect(measure?.yAxisIndex).toBe(0)
        expect(measure?.encode).toEqual({ x: 'y',
          y: 'x' })

        expect(target).toBeDefined()
        expect(target?.yAxisIndex).toBe(0)
        expect(target?.encode).toEqual({ x: 't',
          y: 'x' })
      },
    )

    interface SvgRect {
      readonly fill: string
      readonly x: number
      readonly y: number
      readonly width: number
      readonly height: number
      readonly centerX: number
      readonly centerY: number
    }

    const renderSvgRects = (option: ReturnType<typeof createBulletChartOption>): {
      readonly svg: string
      readonly rects: readonly SvgRect[]
    } => {
      const chart = echarts.init(null, null, {
        renderer: 'svg',
        ssr: true,
        width: 800,
        height: 450,
      })
      chart.setOption(option)
      const svg = chart.renderToSVGString()
      chart.dispose()

      const rects: readonly SvgRect[] = [...svg.matchAll(/<path[^>]*d="([^"]+)"[^>]*fill="([^"]+)"[^>]*>/g)]
        .flatMap((match): readonly SvgRect[] => {
          const d = match[1] ?? ''
          const fill = match[2] ?? ''
          const coords = /^M(-?[\d.]+)\s+(-?[\d.]+)l(-?[\d.]+)\s+(-?[\d.]+)l(-?[\d.]+)\s+(-?[\d.]+)l(-?[\d.]+)\s+(-?[\d.]+)Z$/.exec(d)
          if (!coords) {
            return []
          }
          const x0 = Number(coords[1])
          const y0 = Number(coords[2])
          const dx1 = Number(coords[3])
          const dy1 = Number(coords[4])
          const dx2 = Number(coords[5])
          const dy2 = Number(coords[6])
          const xs = [x0, x0 + dx1, x0 + dx1 + dx2]
          const ys = [y0, y0 + dy1, y0 + dy1 + dy2]
          const minX = Math.min(...xs)
          const maxX = Math.max(...xs)
          const minY = Math.min(...ys)
          const maxY = Math.max(...ys)
          return [{
            fill,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
          }]
        })

      return { svg, rects }
    }

    it(
      'should center Value bar inside range bars and span Target marker across Value bar in SVG',
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

        const { rects } = renderSvgRects(option)
        const rangeRects = rects.filter(r => r.fill === '#e0e0e0')
        const valueRects = rects.filter(r => r.fill === '#5070dd' && r.height > 0)
        // Target marker rects have height 4 (legend icon has height 14)
        const targetRects = rects.filter(r => r.fill === '#000' && Math.abs(r.height - 4) < 0.5)

        expect(rangeRects).toHaveLength(4)
        expect(valueRects).toHaveLength(3) // Category D has value: null (0-height bar)
        expect(targetRects).toHaveLength(3) // Category C has target: undefined

        // Category A and B have both value and range bars
        const rangeA = rangeRects[0]
        const valueA = valueRects[0]
        const targetA = targetRects[0]
        expect(rangeA).toBeDefined()
        expect(valueA).toBeDefined()
        expect(targetA).toBeDefined()

        if (rangeA && valueA && targetA) {
          expect(Math.abs(valueA.centerX - rangeA.centerX)).toBeLessThan(1)
          expect(valueA.width).toBeLessThan(rangeA.width)
          expect(Math.abs(targetA.centerX - valueA.centerX)).toBeLessThan(1)
          expect(targetA.width).toBeGreaterThan(valueA.width)
        }
      },
    )

    it(
      'should center Value bar and span Target marker vertically when flipAxis is true',
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
            flipAxis: true,
          },
        )

        const { rects } = renderSvgRects(option)
        const rangeRects = rects.filter(r => r.fill === '#e0e0e0')
        const valueRects = rects.filter(r => r.fill === '#5070dd' && r.width > 0)
        const targetRects = rects.filter(r => r.fill === '#000' && Math.abs(r.width - 4) < 0.5)

        expect(rangeRects).toHaveLength(4)
        expect(valueRects).toHaveLength(3)
        expect(targetRects).toHaveLength(3)

        const rangeA = rangeRects[0]
        const valueA = valueRects[0]
        const targetA = targetRects[0]
        expect(rangeA).toBeDefined()
        expect(valueA).toBeDefined()
        expect(targetA).toBeDefined()

        if (rangeA && valueA && targetA) {
          expect(Math.abs(valueA.centerY - rangeA.centerY)).toBeLessThan(1)
          expect(valueA.height).toBeLessThan(rangeA.height)
          expect(Math.abs(targetA.centerY - valueA.centerY)).toBeLessThan(1)
          expect(targetA.height).toBeGreaterThan(valueA.height)
        }
      },
    )

    it(
      'should render all metric labels without auto-interval hiding them',
      () => {
        const metrics = [
          'Revenue Growth',
          'Customer Retention',
          'Order Fulfillment',
          'Net Promoter Score',
          'Gross Margin',
          'Churn Rate',
          'Active Users',
          'Conversion Rate',
          'Support Response',
          'Inventory Turnover',
        ]
        const tenMetricData = metrics.map((metric, idx) => ({
          category: metric,
          value: 50 + idx * 3,
          target: 70,
          low: 40,
          mid: 65,
          high: 90,
        }))

        const option = createBulletChartOption(
          tenMetricData,
          'category',
          'value',
          {
            targetProp: 'target',
            rangeLowProp: 'low',
            rangeMidProp: 'mid',
            rangeHighProp: 'high',
          },
        )

        const { svg } = renderSvgRects(option)
        const renderedTexts = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(m => m[1])
        metrics.forEach((metric) => {
          expect(renderedTexts).toContain(metric)
        })
      },
    )
  },
)
