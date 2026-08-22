import type { EChartsOption, EffectScatterSeriesOption, DatasetComponentOption, VisualMapComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, isRecord, safeToString } from './bases-values'
import { getLegendOption } from './legend'
import { asTooltipFormatter } from './tooltip'
import { formatCompactVisualMapLabel } from './visual-map'
import * as R from 'remeda'

export interface EffectScatterTransformerOptions extends BaseTransformerOptions {
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

export interface EffectScatterTooltipParam {
  readonly seriesName?: string
  readonly marker?: string
  // See scatter.ts's identical comment: ECharts' CallbackDataParams.value for
  // an object-row dataset source is the WHOLE raw row, not a single scalar --
  // and (also as in scatter.ts) that object-row shape means the default
  // formatter-less tooltip can never label multi-dim values via `dimensions`/
  // `displayName` here either, so a custom formatter is required.
  readonly value: unknown
}

// See scatter.ts's identical comment for why this is required at all.
function formatTooltip(param: EffectScatterTooltipParam, xLabel: string, yLabel: string, sizeLabel?: string): string {
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

export function createEffectScatterChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  options?: EffectScatterTransformerOptions,
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
    : ((): VisualMapComponentOption => {
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

  const seriesOptions: ReadonlyArray<EffectScatterSeriesOption> = seriesNames.map((name, idx): EffectScatterSeriesOption => {
    const datasetIndex = idx + 1

    return {
      name: name,
      type: 'effectScatter',
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
              return (isScatterDataPoint(val) && val.size !== undefined)
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
      formatter: asTooltipFormatter((param: EffectScatterTooltipParam) => formatTooltip(param, xAxisLabel, yAxisLabel, sizeProp ? (options?.sizeLabel ?? sizeProp) : undefined)),
    },
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
    ...(visualMapOption ? { visualMap: visualMapOption } : {}),
  }

  return opt
}
