import type { EChartsOption, MapSeriesOption, VisualMapComponentOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption, formatCompactVisualMapLabel } from './utils'
import * as R from 'remeda'

export interface MapTransformerOptions extends BaseTransformerOptions {
  readonly mapName: string
  readonly regionProp?: string // Property matching map region names (e.g. "Country")
  readonly valueProp?: string // Value property (e.g. "GDP")
}

export function createMapChartOption(
  data: BasesData,
  mapName: string,
  options?: MapTransformerOptions,
): EChartsOption {
  const regionProp = options?.regionProp
  const valueProp = options?.valueProp
  const title = options?.xAxisLabel // Re-use title prop if needed, or just standard title

  // 1. Map Data
  // Structure: { name: Region, value: Number }
  const mapData = R.pipe(
    data,
    R.map((item) => {
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

  // 2. Calculate Min/Max for VisualMap
  const values = R.map(
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
    data: mapData,
    label: {
      show: false,
    },
    emphasis: {
      label: {
        show: true,
      },
    },
  }

  const opt: EChartsOption = {
    title: title
      ? { text: title,
          left: 'center' }
      : undefined,
    tooltip: {
      trigger: 'item',
      showDelay: 0,
      transitionDuration: 0.2,
    },
    visualMap: visualMapOption,
    series: [seriesItem],
    ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
  }

  return opt
}
