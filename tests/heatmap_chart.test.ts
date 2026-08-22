import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import { formatCompactVisualMapLabel } from '../src/charts/transformers/visual-map'
import { DEFAULT_SEQUENTIAL_COLOR_GRADIENT } from '../src/charts/transformers/palette'
import type { ContinuousVisualMapComponentOption, EChartsOption, HeatmapSeriesOption } from 'echarts'

interface HeatmapSourceItem {
  readonly x: string
  readonly y: string
  readonly value: number
}

function isHeatmapSourceItem(value: unknown): value is HeatmapSourceItem {
  return typeof value === 'object' && value !== null
    && 'x' in value && typeof value.x === 'string'
    && 'y' in value && typeof value.y === 'string'
    && 'value' in value && typeof value.value === 'number'
}

// EChartsOption['xAxis']/['yAxis'] are `type`-discriminated unions (only the
// 'category' member has `.data`) -- heatmap.ts always sets both to
// 'category', so this checks the real discriminant rather than asserting it.
function firstCategoryXAxis(option: EChartsOption) {
  const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
  if (xAxis?.type !== 'category') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a category xAxis, got ${String(xAxis?.type)}`)
  }
  return xAxis
}

function firstCategoryYAxis(option: EChartsOption) {
  const yAxis = Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis
  if (yAxis?.type !== 'category') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a category yAxis, got ${String(yAxis?.type)}`)
  }
  return yAxis
}

// EChartsOption['series'] is a `type`-discriminated union, so this needs no
// cast -- checking the literal `type` narrows `series` to HeatmapSeriesOption.
function firstHeatmapSeries(option: EChartsOption): HeatmapSeriesOption {
  const series = Array.isArray(option.series) ? option.series[0] : option.series
  if (series?.type !== 'heatmap') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a heatmap series, got ${String(series?.type)}`)
  }
  return series
}

// heatmap.ts always sets visualMap.type explicitly (defaulting to
// 'continuous' when options.visualMapType is omitted, as in every test
// below), so this checks the real discriminant rather than asserting it.
function firstContinuousVisualMap(option: EChartsOption): ContinuousVisualMapComponentOption {
  const visualMap = Array.isArray(option.visualMap) ? option.visualMap[0] : option.visualMap
  if (visualMap?.type !== 'continuous') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a continuous visualMap, got ${String(visualMap?.type)}`)
  }
  return visualMap
}

// DatasetOption['source'] is a generic library union (array-of-arrays,
// array-of-objects, or dict) with no discriminant TS can check -- this is a
// genuine runtime shape check, not an unverified cast to our known row type.
function firstDatasetSource(option: EChartsOption): readonly HeatmapSourceItem[] {
  const dataset = Array.isArray(option.dataset) ? option.dataset[0] : option.dataset
  const source = dataset?.source
  return Array.isArray(source) ? source.flatMap(row => isHeatmapSourceItem(row) ? [row] : []) : []
}

describe(
  'Heatmap Transformer',
  () => {
    it(
      'should create a valid heatmap option',
      () => {
        const data = [
          { x: 'Mon',
            y: 'Morning',
            val: 5 },
          { x: 'Mon',
            y: 'Evening',
            val: 10 },
          { x: 'Tue',
            y: 'Morning',
            val: 2 },
          { x: 'Tue',
            y: 'Evening',
            val: 20 },
        ]

        const option = transformDataToChartOption(
          data,
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )

        expect(option).toBeDefined()
        // Check X Axis
        const xAxis = firstCategoryXAxis(option)

        expect(xAxis.type).toBe('category')

        expect(xAxis.data).toContain('Mon')

        expect(xAxis.data).toContain('Tue')

        // Check Y Axis
        const yAxis = firstCategoryYAxis(option)

        expect(yAxis.type).toBe('category')

        expect(yAxis.data).toContain('Morning')

        expect(yAxis.data).toContain('Evening')

        // Check Series
        const series = firstHeatmapSeries(option)

        expect(series.datasetIndex).toBe(0)
        const source = firstDatasetSource(option)
        expect(source).toHaveLength(4)
        expect(source[0]).toEqual({ x: 'Mon',
          y: 'Morning',
          value: 5 })
      },
    )

    it(
      'should handle missing values gracefully',
      () => {
        const data = [
          { x: 'Mon',
            y: 'Morning',
            val: 5 },
          { x: 'Mon',
            y: 'Evening' }, // Missing val
        ]

        const option = transformDataToChartOption(
          data,
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )
        const source = firstDatasetSource(option)

        // Should produce 0 for missing value based on current logic
        const missingPoint = source.find(d => d.value === 0)
        expect(missingPoint).toBeDefined()
      },
    )

    it(
      'should format cell labels from dataset-encoded params instead of showing a bare dash',
      () => {
        // Regression: ECharts can't derive a default label from our
        // dataset+encode series (only from raw [x, y, value] tuples) —
        // without an explicit formatter every cell rendered '-'.
        const data = [
          { x: 'Mon',
            y: 'Morning',
            val: 5 },
        ]

        const option = transformDataToChartOption(
          data,
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )
        const series = firstHeatmapSeries(option)
        const formatter = series.label?.formatter
        if (typeof formatter !== 'function') {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
          throw new Error('expected series.label.formatter to be a function')
        }

        // The formatter only reads `params.value`; ECharts' real CallbackDataParams
        // has a dozen other required fields (componentType, dataIndex, $vars, ...)
        // this formatter never touches, so a full mock would test nothing extra.
        // eslint-disable-next-line no-restricted-syntax -- library callback type bridge: see comment above for why a minimal double is used instead of a full CallbackDataParams mock.
        const call = (value: unknown) => formatter({ value } as unknown as Parameters<typeof formatter>[0])
        expect(call({ x: 'Mon', y: 'Morning', value: 5 })).toBe('5')
        expect(call(undefined)).toBe('')
      },
    )

    it(
      'should calculate visualMap min/max correctly',
      () => {
        const data = [
          { x: 'A',
            y: '1',
            val: 10 },
          { x: 'B',
            y: '2',
            val: 100 },
        ]

        const option = transformDataToChartOption(
          data,
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )
        const visualMap = firstContinuousVisualMap(option)

        expect(visualMap.min).toBe(10)

        expect(visualMap.max).toBe(100)
      },
    )

    it(
      'should abbreviate visualMap handle labels to avoid overlap on large-value axes',
      () => {
        const data = [
          { x: 'A',
            y: '1',
            val: 10 },
          { x: 'B',
            y: '2',
            val: 100 },
        ]

        const option = transformDataToChartOption(
          data,
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )
        const visualMap = firstContinuousVisualMap(option)

        expect(visualMap.formatter).toBe(formatCompactVisualMapLabel)
      },
    )

    it(
      'applies the default sequential blue gradient (light->dark) when no visualMapColor is set',
      () => {
        // Regression for bck-aie.26: heatmap value is a magnitude, so the
        // default ramp must be sequential (one hue, monotonic lightness), not
        // the old blue->yellow->red spectral rainbow that made both ends read
        // as equally intense. Guards against a revert to a diverging/rainbow
        // default.
        const option = transformDataToChartOption(
          [{ x: 'A', y: '1', val: 10 }],
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )
        const visualMap = firstContinuousVisualMap(option)

        expect(visualMap.inRange?.color).toEqual([...DEFAULT_SEQUENTIAL_COLOR_GRADIENT])
        // Light low end, dark high end -- the sequential invariant.
        const colors = visualMap.inRange?.color
        if (!Array.isArray(colors)) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
          throw new Error('expected visualMap.inRange.color to be an array')
        }
        expect(colors[0]).toBe('#cde2fb')
        expect(colors.at(-1)).toBe('#0d366b')
      },
    )

    it(
      'uses an explicit visualMapColor override instead of the default gradient',
      () => {
        // The override is the hook a future theme layer drives to re-tint the
        // ramp; it must win over the default.
        const override = ['#e5f5e0',
          '#41ab5d',
          '#005a32']
        const option = transformDataToChartOption(
          [{ x: 'A', y: '1', val: 10 }],
          'x',
          'y',
          'heatmap',
          { valueProp: 'val', visualMapColor: override },
        )
        const visualMap = firstContinuousVisualMap(option)

        expect(visualMap.inRange?.color).toEqual(override)
      },
    )

    it(
      'outlines cell labels with a light halo so values read on both light and dark cells',
      () => {
        // The sequential ramp spans light->dark, so no single ink stays
        // readable on every cell. A light textBorder halo around dark ink is
        // the "confusing numbers" legibility fix.
        const option = transformDataToChartOption(
          [{ x: 'A', y: '1', val: 10 }],
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )
        const series = firstHeatmapSeries(option)
        const label = series.label

        expect(label?.color).toBe('#1a1a19')
        expect(label?.textBorderColor).toBe('rgba(255, 255, 255, 0.85)')
        expect(label?.textBorderWidth).toBe(2)
      },
    )

    it(
      'thins x-axis labels when there are many time categories',
      () => {
        // A time-of-day heatmap can carry 24 hourly categories (> the shared
        // MANY_CATEGORIES_THRESHOLD of 15); at interval 0 every label renders
        // and they collide, so the axis switches to 'auto' thinning. (Rotation
        // is the separate cross-cutting bck-i9b.12 concern and is left to it.)
        const manyHours = Array.from({ length: 24 }, (_, h) => ({
          x: `${String(h).padStart(2, '0')}:00`,
          y: 'Mon',
          val: h,
        }))
        const option = transformDataToChartOption(
          manyHours,
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )
        const xAxis = firstCategoryXAxis(option)

        expect(xAxis.axisLabel?.interval).toBe('auto')
      },
    )

    it(
      'shows every x-axis label when few categories',
      () => {
        const option = transformDataToChartOption(
          [{ x: 'Mon', y: '1', val: 10 },
            { x: 'Tue', y: '1', val: 20 }],
          'x',
          'y',
          'heatmap',
          { valueProp: 'val' },
        )
        const xAxis = firstCategoryXAxis(option)

        expect(xAxis.axisLabel?.interval).toBe(0)
      },
    )
  },
)
