import { describe, it, expect } from 'bun:test'
import { createScatterChartOption } from '../src/charts/transformers/scatter'
import { createCandlestickChartOption } from '../src/charts/transformers/candlestick'
import type { CandlestickSeriesOption, ContinuousVisualMapComponentOption, EChartsOption, ScatterSeriesOption } from 'echarts'

interface ScatterDatasetSource {
  readonly x: string
  readonly y: number
  readonly s: string
  readonly size?: number
}

interface CandlestickDatasetSource {
  readonly x: string
  readonly open: number
  readonly close: number
  readonly low: number
  readonly high: number
}

function isScatterDatasetSource(value: unknown): value is ScatterDatasetSource {
  return typeof value === 'object' && value !== null
    && 'x' in value && typeof value.x === 'string'
    && 'y' in value && typeof value.y === 'number'
    && 's' in value && typeof value.s === 'string'
}

function isCandlestickDatasetSource(value: unknown): value is CandlestickDatasetSource {
  return typeof value === 'object' && value !== null
    && 'x' in value && typeof value.x === 'string'
    && 'open' in value && typeof value.open === 'number'
    && 'close' in value && typeof value.close === 'number'
    && 'low' in value && typeof value.low === 'number'
    && 'high' in value && typeof value.high === 'number'
}

// DatasetOption['source'] is a generic library union with no discriminant TS
// can check -- these are genuine runtime shape checks, not unverified casts.
function firstScatterSource(option: EChartsOption): readonly ScatterDatasetSource[] {
  const dataset = Array.isArray(option.dataset) ? option.dataset[0] : option.dataset
  const source = dataset?.source
  return Array.isArray(source) ? source.flatMap(row => isScatterDatasetSource(row) ? [row] : []) : []
}

function firstCandlestickSource(option: EChartsOption): readonly CandlestickDatasetSource[] {
  const dataset = Array.isArray(option.dataset) ? option.dataset[0] : option.dataset
  const source = dataset?.source
  return Array.isArray(source) ? source.flatMap(row => isCandlestickDatasetSource(row) ? [row] : []) : []
}

// EChartsOption['series']/['visualMap'] are `type`-discriminated unions, so
// checking the literal `type` narrows them with no cast.
function scatterSeriesAt(option: EChartsOption, index: number): ScatterSeriesOption {
  const all = option.series
  const series = Array.isArray(all) ? all[index] : all
  if (series?.type !== 'scatter') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a scatter series at ${index}, got ${String(series?.type)}`)
  }
  return series
}

function firstCandlestickSeries(option: EChartsOption): CandlestickSeriesOption {
  const series = Array.isArray(option.series) ? option.series[0] : option.series
  if (series?.type !== 'candlestick') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a candlestick series, got ${String(series?.type)}`)
  }
  return series
}

// scatter.ts sets visualMap.type explicitly (defaulting to 'continuous'), so
// this checks the real discriminant rather than asserting it.
function firstContinuousVisualMap(option: EChartsOption): ContinuousVisualMapComponentOption {
  const visualMap = Array.isArray(option.visualMap) ? option.visualMap[0] : option.visualMap
  if (visualMap?.type !== 'continuous') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`expected a continuous visualMap, got ${String(visualMap?.type)}`)
  }
  return visualMap
}

describe(
  'Transformers with Dataset - Extended',
  () => {
    describe(
      'Scatter Transformer',
      () => {
        it(
          'should create options using dataset and transform for grouped data',
          () => {
            const data = [
              { x: 'A',
                y: 10,
                group: 'G1',
                size: 5 },
              { x: 'A',
                y: 20,
                group: 'G2',
                size: 10 },
              { x: 'B',
                y: 15,
                group: 'G1',
                size: 5 },
            ]

            const option = createScatterChartOption(
              data,
              'x',
              'y',
              { seriesProp: 'group',
                sizeProp: 'size' },
            )

            expect(option.dataset).toBeDefined()
            expect(Array.isArray(option.dataset)).toBe(true)

            const source = firstScatterSource(option)
            expect(source).toHaveLength(3)

            // Check normalization
            expect(source[0]).toEqual({ x: 'A',
              y: 10,
              s: 'G1',
              size: 5 })

            // Expect G1 and G2 series
            expect(option.series).toHaveLength(2)

            expect(scatterSeriesAt(option, 0).datasetIndex).toBe(1)
            expect(scatterSeriesAt(option, 0).encode).toEqual({ x: 'x',
              y: 'y',
              tooltip: ['x',
                'y',
                'size',
                's'] })

            // Symbol size check - now handled via visualMap if sizeProp is present

            // Refactored to avoid if/else

            const checkVisualMap = () => {
              // scatter.ts stores the dimension as the string 'size' via its
              // isolated getDimension() type-lie, so the declared `number` type
              // doesn't reflect the real runtime value -- read it as unknown.
              const dimension: unknown = firstContinuousVisualMap(option).dimension
              expect(dimension).toBe('size')
            }

            const checkSymbolSizeFn = () => {
              const sizeFn = scatterSeriesAt(option, 0).symbolSize
              expect(sizeFn).toBeTypeOf('function')
              // We could test the function logic if we cast it, but presence is enough for this branch
            }

            option.visualMap ? checkVisualMap() : checkSymbolSizeFn()
          },
        )
      },
    )

    describe(
      'Candlestick Transformer',
      () => {
        it(
          'should create options using dataset',
          () => {
            const data = [
              { date: '2023-01-01',
                open: 10,
                close: 20,
                low: 5,
                high: 25 },
            ]

            const option = createCandlestickChartOption(
              data,
              'date',
            )

            expect(option.dataset).toBeDefined()
            const source = firstCandlestickSource(option)

            expect(source).toEqual([{ x: '2023-01-01',
              open: 10,
              close: 20,
              low: 5,
              high: 25 }])

            expect(firstCandlestickSeries(option).encode).toEqual({ x: 'x',
              y: ['open',
                'close',
                'low',
                'high'],
              tooltip: ['open',
                'close',
                'low',
                'high'] })
          },
        )
      },
    )
  },
)
