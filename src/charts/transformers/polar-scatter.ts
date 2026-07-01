import type { EChartsOption, ScatterSeriesOption, DatasetComponentOption, VisualMapComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption, isRecord } from './utils'
import * as R from 'remeda'

export interface PolarScatterTransformerOptions extends BaseTransformerOptions {
  readonly seriesProp?: string
  readonly sizeProp?: string
}

interface ScatterDataPoint {
  readonly x: string
  readonly y: number | null
  readonly s: string
  readonly size?: number
}

function isScatterDataPoint(val: unknown): val is ScatterDataPoint {
  return isRecord(val) && 'x' in val && 'y' in val && 's' in val
}

// Isolate cast for dimension
function getDimension(dimName: string): number {
  // ECharts types claim dimension must be number (index), but string (name) works for object datasets.
  // Isolate this lie.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-restricted-syntax
  return dimName as unknown as number
}

export function createPolarScatterChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  options?: PolarScatterTransformerOptions,
): EChartsOption {
  const seriesProp = options?.seriesProp
  const sizeProp = options?.sizeProp
  const yAxisLabel = options?.yAxisLabel ?? yProp

  // xProp maps to Angle Axis (Category)
  // yProp maps to Radius Axis (Value)

  // 1. Normalize Data for Dataset
  // Structure: { x, y, s (series), size? }
  const normalizedData = R.map(
    data,
    (item) => {
      const xRaw = getNestedValue(
        item,
        xProp,
      )
      const yRaw = Number(getNestedValue(
        item,
        yProp,
      ))
      const sRaw = seriesProp
        ? getNestedValue(
            item,
            seriesProp,
          )
        : undefined
      const sizeRaw = sizeProp
        ? Number(getNestedValue(
            item,
            sizeProp,
          ))
        : undefined

      return {
        x: xRaw === undefined || xRaw === null ? 'Unknown' : safeToString(xRaw),
        y: Number.isNaN(yRaw) ? null : yRaw,
        s: seriesProp && sRaw !== undefined && sRaw !== null ? safeToString(sRaw) : yAxisLabel,
        ...(sizeProp ? { size: Number.isNaN(sizeRaw) ? 0 : sizeRaw } : {}),
      }
    },
  )

  // 2. Get unique X values (categories) for Angle Axis
  const angleAxisData = R.pipe(
    normalizedData,
    R.map(d => d.x),
    R.unique(),
  )

  // 3. Get unique Series
  const seriesNames = R.pipe(
    normalizedData,
    R.map(d => d.s),
    R.unique(),
  )

  // 4. Create Datasets
  const sourceDataset: DatasetComponentOption = { source: normalizedData }

  const filterDatasets: DatasetComponentOption[] = seriesNames.map(name => ({
    transform: {
      type: 'filter',
      config: { dimension: 's',
        value: name },
    },
  }))

  const datasets: DatasetComponentOption[] = [sourceDataset,
    ...filterDatasets]

  // Calculate Min/Max for VisualMap if needed
  const visualMapOption: VisualMapComponentOption | undefined = (!sizeProp && !options?.visualMapType)
    ? undefined
    : (() => {
        const sizes = sizeProp
          ? R.pipe(
              normalizedData,
              R.map(d => d.size),
              R.filter((d): d is number => d !== undefined),
            )
          : []
        const dataMin = sizes.length > 0 ? Math.min(...sizes) : 0
        const dataMax = sizes.length > 0 ? Math.max(...sizes) : 10

        const finalMinVal = options?.visualMapMin !== undefined ? options.visualMapMin : dataMin
        const finalMaxVal = options?.visualMapMax !== undefined ? options.visualMapMax : dataMax

        return {
          min: finalMinVal,
          max: finalMaxVal,
          calculable: true,
          orient: options?.visualMapOrient ?? 'horizontal',
          left: options?.visualMapLeft ?? 'center',
          bottom: options?.visualMapTop !== undefined ? undefined : '0%', // Default bottom if top not set
          top: options?.visualMapTop,
          type: options?.visualMapType ?? 'continuous',
          dimension: sizeProp ? getDimension('size') : undefined,
          inRange: {
            ...(options?.visualMapColor ? { color: options.visualMapColor } : {}),
            ...(sizeProp
              ? { symbolSize: [10,
                  50] }
              : {}),
          },
        }
      })()

  // 5. Build Series Options
  const seriesOptions: ScatterSeriesOption[] = seriesNames.map((name, idx) => {
    const datasetIndex = idx + 1

    return {
      name: name,
      type: 'scatter',
      coordinateSystem: 'polar',
      datasetIndex: datasetIndex,
      encode: {
        angle: 'x',
        radius: 'y',
        tooltip: sizeProp
          ? ['x',
              'y',
              'size',
              's']
          : ['x',
              'y',
              's'],
      },
      ...(sizeProp && !visualMapOption
        ? {
            symbolSize: (val: unknown) => {
              return isScatterDataPoint(val) && val.size !== undefined
                ? Math.max(
                    0,
                    Number(val.size),
                  )
                : 10
            },
          }
        : {}),
    }
  })

  const opt: EChartsOption = {
    dataset: datasets,
    polar: {},
    angleAxis: {
      type: 'category',
      data: angleAxisData,
      startAngle: 90,
      splitLine: { show: true },
    },
    radiusAxis: {
      type: 'value',
      splitLine: { show: true },
    },
    series: seriesOptions,
    tooltip: {
      trigger: 'item',
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
    ...(visualMapOption ? { visualMap: visualMapOption } : {}),
  }

  return opt
}
