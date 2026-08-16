import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../src/charts/transformer'
import { formatCompactVisualMapLabel } from '../src/charts/transformers/utils'
import { DEFAULT_HEATMAP_COLOR_GRADIENT } from '../src/charts/transformers/palette'
import type { DatasetComponentOption } from 'echarts'

interface HeatmapSourceItem {
  readonly x: string
  readonly y: string
  readonly value: number
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
        const xAxis = option.xAxis as any

        expect(xAxis.type).toBe('category')

        expect(xAxis.data).toContain('Mon')

        expect(xAxis.data).toContain('Tue')

        // Check Y Axis
        const yAxis = option.yAxis as any

        expect(yAxis.type).toBe('category')

        expect(yAxis.data).toContain('Morning')

        expect(yAxis.data).toContain('Evening')

        // Check Series
        const series = option.series as readonly any[]
        expect(series).toHaveLength(1)

        expect(series[0]?.type).toBe('heatmap')

        // Check Data Mapping

        expect(series[0].datasetIndex).toBe(0)
        const dataset = option.dataset as readonly DatasetComponentOption[]
        expect(dataset).toBeDefined()

        // @ts-expect-error - suppress strictNullChecks in tests
        const source = dataset[0].source as readonly HeatmapSourceItem[]
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
        const dataset = option.dataset as readonly DatasetComponentOption[]

        // @ts-expect-error - suppress strictNullChecks in tests
        const source = dataset[0].source as readonly HeatmapSourceItem[]

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
        const series = option.series as any
        const formatter = series[0].label.formatter as (params: unknown) => string

        expect(formatter({ value: { x: 'Mon', y: 'Morning', value: 5 } })).toBe('5')
        expect(formatter({ value: undefined })).toBe('')
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
        const visualMap = option.visualMap as any

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
        const visualMap = option.visualMap as any

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
        const visualMap = option.visualMap as any

        expect(visualMap.inRange.color).toEqual([...DEFAULT_HEATMAP_COLOR_GRADIENT])
        // Light low end, dark high end -- the sequential invariant.
        expect(visualMap.inRange.color[0]).toBe('#cde2fb')
        expect(visualMap.inRange.color.at(-1)).toBe('#0d366b')
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
        const visualMap = option.visualMap as any

        expect(visualMap.inRange.color).toEqual(override)
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
        const label = (option.series as any)[0].label

        expect(label.color).toBe('#1a1a19')
        expect(label.textBorderColor).toBe('rgba(255, 255, 255, 0.85)')
        expect(label.textBorderWidth).toBe(2)
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
        const xAxis = option.xAxis as any

        expect(xAxis.axisLabel.interval).toBe('auto')
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
        const xAxis = option.xAxis as any

        expect(xAxis.axisLabel.interval).toBe(0)
      },
    )
  },
)
