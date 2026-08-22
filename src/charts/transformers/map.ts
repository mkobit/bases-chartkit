import type { EChartsOption, MapSeriesOption, VisualMapComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, safeToString } from './bases-values'
import { getLegendOption } from './legend'
import { formatCompactVisualMapLabel } from './visual-map'
import * as R from 'remeda'

export interface MapTransformerOptions extends BaseTransformerOptions {
  readonly mapName: string
  readonly regionProp?: string // Property matching map region names (e.g. "Country")
  readonly valueProp?: string // Value property (e.g. "GDP")
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

  const visualMapOption: VisualMapComponentOption = {
    min: options?.visualMapMin ?? dataMin,
    max: options?.visualMapMax ?? dataMax,
    calculable: true,
    orient: options?.visualMapOrient ?? 'horizontal',
    left: options?.visualMapLeft ?? 'center',
    top: options?.visualMapTop,
    bottom: options?.visualMapTop !== undefined ? undefined : '5%',
    text: ['High',
      'Low'],
    type: options?.visualMapType ?? 'continuous',
    formatter: formatCompactVisualMapLabel,
    inRange: options?.visualMapColor ? { color: options.visualMapColor } : undefined,
  }

  const seriesItem: MapSeriesOption = {
    type: 'map',
    map: mapName,
    roam: true,
    data: [...mapData],
    label: {
      show: false,
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

  const opt: EChartsOption = {
    tooltip: {
      trigger: 'item',
      showDelay: 0,
      transitionDuration: 0.2,
    },
    visualMap: visualMapOption,
    series: [seriesItem],
    ...(getLegendOption(mapOptions) ? { legend: getLegendOption(mapOptions) } : {}),
  }

  return opt
}
