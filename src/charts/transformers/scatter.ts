import type { EChartsOption, ScatterSeriesOption, DatasetComponentOption, VisualMapComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, isRecord, safeToString } from './bases-values'
import { getLegendOption } from './legend'
import { asTooltipFormatter } from './tooltip'
import { formatCompactVisualMapLabel } from './visual-map'
import * as R from 'remeda'

export interface ScatterTransformerOptions extends BaseTransformerOptions {
  readonly seriesProp?: string
  readonly sizeProp?: string
  readonly sizeLabel?: string
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

export interface ScatterTooltipParam {
  readonly seriesName?: string
  readonly marker?: string
  // ECharts' CallbackDataParams.value for an object-row dataset source is the
  // WHOLE raw row, not a single scalar (see PieTooltipParam's identical
  // comment in pie.ts for the retrieveRawValue mechanism this comes from).
  readonly value: unknown
}

// ECharts' default (formatter-less) tooltip only renders a labeled, one-line-
// per-dim block when data.getRawValue() returns an ARRAY -- confirmed via
// node_modules/echarts/lib/component/tooltip/seriesFormatTooltip.js's
// formatTooltipArrayValue: `isValueMultipleLine` comes from
// zrender's `reduce(value, ...)`, which no-ops (returns its initial `false`)
// whenever `value` isn't array-like, silently skipping every dim's
// `displayName` check. For an object-row dataset (this transformer's shape),
// `getRawValue()` returns the raw row OBJECT, not an array, so that check
// never fires no matter how a series' `dimensions`/`displayName` are
// declared -- confirmed live: declaring displayName here produced the exact
// same unlabeled, comma-joined tooltip as not declaring it at all. A fully
// custom formatter, reading the same raw row via `param.value`, is the only
// way to get labeled output for this dataset shape.
function formatTooltip(param: ScatterTooltipParam, xLabel: string, yLabel: string, sizeLabel?: string): string {
  const row = isScatterDataPoint(param.value) ? param.value : null
  if (!row) {
    return ''
  }
  const marker = param.marker ?? ''
  const header = param.seriesName ? `${marker}<b>${param.seriesName}</b><br/>` : ''
  const yText = row.y === null ? '-' : row.y.toLocaleString('en-US')
  const sizeLine = sizeLabel && row.size !== undefined ? `<br/>${sizeLabel}: ${row.size.toLocaleString('en-US')}` : ''
  return `${header}${xLabel}: ${row.x}<br/>${yLabel}: ${yText}${sizeLine}`
}

function getDimension(dimName: string): number {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-restricted-syntax -- ECharts types claim dimension must be number (index), but string (name) works for object datasets. Isolate this lie.
  return dimName as unknown as number
}

export function createScatterChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  options?: ScatterTransformerOptions,
): EChartsOption {
  const seriesProp = options?.seriesProp
  const sizeProp = options?.sizeProp
  const xAxisLabel = options?.xAxisLabel ?? xProp
  const yAxisLabel = options?.yAxisLabel ?? yProp
  const xAxisRotate = options?.xAxisLabelRotate ?? 0

  const normalizedData: ReadonlyArray<ScatterDataPoint> = R.map(
    data,
    (item): ScatterDataPoint => {
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

  const xAxisData: readonly string[] = R.pipe(
    normalizedData,
    R.map(d => d.x),
    R.unique(),
  )

  const seriesNames: readonly string[] = R.pipe(
    normalizedData,
    R.map(d => d.s),
    R.unique(),
  )

  const sourceDataset: DatasetComponentOption = {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-restricted-syntax -- normalizedData's row shape varies per chart; ECharts dataset.source just needs plain records.
    source: normalizedData as unknown as Record<string, unknown>[],
  }

  const filterDatasets: ReadonlyArray<DatasetComponentOption> = seriesNames.map((name): DatasetComponentOption => ({
    transform: {
      type: 'filter',
      config: { dimension: 's',
        value: name },
    },
  }))

  const datasets: ReadonlyArray<DatasetComponentOption> = [sourceDataset,
    ...filterDatasets]

  const visualMapOption: Readonly<VisualMapComponentOption> | undefined = (!sizeProp && !options?.visualMapType)
    ? undefined
    // eslint-disable-next-line functional/prefer-immutable-types -- VisualMapComponentOption is a union type alias (ContinuousVisualMapOption | PiecewiseVisualMapOption); Readonly<> wrapping a union loses the alias identity the ignoreTypePattern name match relies on (bd memory: prefer-immutable-types-union-option-alias-gap).
    : ((): Readonly<VisualMapComponentOption> => {
        const sizes: readonly number[] = sizeProp
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
          bottom: options?.visualMapTop !== undefined ? undefined : '0%',
          top: options?.visualMapTop,
          type: options?.visualMapType ?? 'continuous',
          formatter: formatCompactVisualMapLabel,
          dimension: sizeProp ? getDimension('size') : undefined,
          inRange: {
            ...(options?.visualMapColor ? { color: [...options.visualMapColor] } : {}),
            ...(sizeProp
              ? { symbolSize: [10,
                  50] }
              : {}),
          },
        }
      })()

  const seriesOptions: ReadonlyArray<ScatterSeriesOption> = seriesNames.map((name, idx): ScatterSeriesOption => {
    const datasetIndex = idx + 1

    return {
      name: name,
      type: 'scatter',
      datasetIndex: datasetIndex,
      encode: {
        x: 'x',
        y: 'y',
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
    dataset: [...datasets],
    xAxis: {
      type: 'category', // Consistent with bar/line
      data: [...xAxisData],
      name: xAxisLabel,
      splitLine: { show: true },
      axisLabel: {
        rotate: xAxisRotate,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      splitLine: { show: true },
    },
    series: [...seriesOptions],
    tooltip: {
      trigger: 'item',
      formatter: asTooltipFormatter((param: ScatterTooltipParam) => formatTooltip(param, xAxisLabel, yAxisLabel, sizeProp ? (options?.sizeLabel ?? sizeProp) : undefined)),
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),

    ...(visualMapOption ? { visualMap: visualMapOption } : {}),
  }

  return opt
}
