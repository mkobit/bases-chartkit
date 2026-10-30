import type { EChartsOption, MapSeriesOption, VisualMapComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, isRecord, safeToString } from './bases-values'
import { formatValue } from './formatters'
import { getLegendOption } from './legend'
import { getTitleOption } from './title'
import { asTooltipFormatter } from './tooltip'
import { formatCompactVisualMapLabel } from './visual-map'
import * as R from 'remeda'

export interface MapVisualMapPiece {
  readonly min?: number
  readonly max?: number
  readonly value?: number
  readonly label?: string
  readonly color?: string
}

export interface MapTransformerOptions extends BaseTransformerOptions {
  readonly mapName: string
  readonly regionProp?: string // Property matching map region names (e.g. "Country")
  readonly valueProp?: string // Value property (e.g. "GDP")
  readonly visualMapSplitNumber?: number
  readonly visualMapPieces?: readonly MapVisualMapPiece[]
  readonly showLabel?: boolean
  readonly roam?: boolean | 'scale' | 'move'
  readonly theme?: string
}

export interface MapTooltipParam {
  readonly name: string
  readonly value?: unknown
}

export function formatMapTooltip(param: MapTooltipParam, valueFormat: string): string {
  const rawValue = isRecord(param.value) && 'value' in param.value ? param.value.value : param.value
  return rawValue !== undefined && rawValue !== null && !Number.isNaN(Number(rawValue))
    ? `${param.name} : ${formatValue(rawValue, valueFormat)}`
    : param.name
}

type MapRegionValue = Readonly<{
  name: string
  value: number
}>

export function createMapChartOption(
  data: BasesData,
  mapName: string,
  options?: MapTransformerOptions,
): EChartsOption {
  const regionProp = options?.regionProp
  const valueProp = options?.valueProp

  const mapData: ReadonlyArray<MapRegionValue> = R.pipe(
    data,
    R.map((item): MapRegionValue => {
      const nameRaw = regionProp
        ? getNestedValue(
            item,
            regionProp,
          )
        : undefined
      const valRaw = valueProp
        ? getNestedValue(
            item,
            valueProp,
          )
        : undefined

      const valNum = valRaw ? Number(valRaw) : 0
      return {
        name: nameRaw ? safeToString(nameRaw) : '',
        value: Number.isNaN(valNum) ? 0 : valNum,
      }
    }),
    R.filter(item => item.name !== ''),
  )

  const values: readonly number[] = R.map(
    mapData,
    d => d.value,
  )
  const dataMin = values.length > 0 ? Math.min(...values) : 0
  const dataMax = values.length > 0 ? Math.max(...values) : 100

  const isVertical = options?.visualMapOrient === 'vertical'
  const isPiecewise = options?.visualMapType === 'piecewise'
  const inRangeColor = options?.visualMapColor && options.visualMapColor.length > 0
    ? { color: [...options.visualMapColor] }
    : undefined

  const visualMapOption: VisualMapComponentOption = isPiecewise
    ? {
        type: 'piecewise',
        min: options?.visualMapMin ?? dataMin,
        max: options?.visualMapMax ?? dataMax,
        orient: options?.visualMapOrient ?? 'horizontal',
        left: options?.visualMapLeft ?? (isVertical ? 'left' : 'center'),
        top: options?.visualMapTop ?? (isVertical ? 'center' : undefined),
        bottom: options?.visualMapTop !== undefined || isVertical ? undefined : '5%',
        text: ['High',
          'Low'],
        formatter: formatCompactVisualMapLabel,
        inRange: inRangeColor,
        ...(options?.visualMapSplitNumber !== undefined
          ? { splitNumber: options.visualMapSplitNumber }
          : {}),
        ...(options?.visualMapPieces !== undefined
          ? { pieces: options.visualMapPieces.map(piece => ({ ...piece })) }
          : {}),
      }
    : {
        type: 'continuous',
        min: options?.visualMapMin ?? dataMin,
        max: options?.visualMapMax ?? dataMax,
        calculable: true,
        orient: options?.visualMapOrient ?? 'horizontal',
        left: options?.visualMapLeft ?? (isVertical ? 'left' : 'center'),
        top: options?.visualMapTop ?? (isVertical ? 'center' : undefined),
        bottom: options?.visualMapTop !== undefined || isVertical ? undefined : '5%',
        text: ['High',
          'Low'],
        formatter: formatCompactVisualMapLabel,
        inRange: inRangeColor,
      }

  const seriesItem: MapSeriesOption = {
    type: 'map',
    map: mapName,
    roam: options?.roam ?? true,
    data: [...mapData],
    label: {
      show: options?.showLabel ?? false,
    },
    emphasis: {
      label: {
        show: true,
      },
    },
  }

  const mapOptions = options?.xAxisLabel && !options.title
    ? { ...options, title: options.xAxisLabel }
    : options

  const titleOpt = getTitleOption(mapOptions)
  const valueFormat = options?.valueFormat

  const opt: EChartsOption = {
    ...(titleOpt ? { title: titleOpt } : {}),
    tooltip: {
      trigger: 'item',
      showDelay: 0,
      transitionDuration: 0.2,
      ...(valueFormat !== undefined
        ? {
            formatter: asTooltipFormatter((param: MapTooltipParam) => formatMapTooltip(param, valueFormat)),
          }
        : {}),
    },
    visualMap: visualMapOption,
    series: [seriesItem],
    ...(getLegendOption(mapOptions) ? { legend: getLegendOption(mapOptions) } : {}),
    ...(options?.theme ? { theme: options.theme } : {}),
  }

  return opt
}
