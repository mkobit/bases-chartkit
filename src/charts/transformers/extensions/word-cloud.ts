import type * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import * as R from 'remeda'
import type { BaseTransformerOptions, BasesData } from '../base'
import { getNestedValue, safeToString } from '../utils'

export interface WordCloudTransformerOptions extends BaseTransformerOptions {
  readonly shape?: 'circle' | 'cardioid' | 'diamond' | 'triangle-forward' | 'triangle' | 'pentagon' | 'star'
  readonly gridSize?: number
  readonly sizeRangeMin?: number
  readonly sizeRangeMax?: number
  readonly rotationRangeMin?: number
  readonly rotationRangeMax?: number
  readonly rotationStep?: number
}

interface WordCloudDataPoint {
  readonly name: string
  readonly value: number
}

export function createWordCloudChartOption(
  data: BasesData,
  nameProp: string,
  valueProp: string,
  options?: WordCloudTransformerOptions,
): EChartsOption {
  const normalizedData: ReadonlyArray<WordCloudDataPoint> = R.pipe(
    data,
    R.map((item) => {
      const name = safeToString(getNestedValue(item, nameProp))
      const value = Number(getNestedValue(item, valueProp))
      return {
        name: name || 'Unknown',
        value: Number.isNaN(value) ? 0 : value,
      }
    }),
    R.filter(item => item.value > 0),
  )

  const seriesItem = {
    type: 'wordCloud',
    gridSize: options?.gridSize ?? 2,
    sizeRange: [
      options?.sizeRangeMin ?? 12,
      options?.sizeRangeMax ?? 60],
    rotationRange: [
      options?.rotationRangeMin ?? -90,
      options?.rotationRangeMax ?? 90],
    rotationStep: options?.rotationStep ?? 45,
    shape: options?.shape ?? 'circle',
    drawOutOfBound: false,
    textStyle: {
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      // Color will be handled by ECharts theme or default behavior if not specified
      // To strictly follow functional protocols, we avoid inline random generation here
    },
    emphasis: {
      focus: 'self',
      textStyle: {
        shadowBlur: 10,
        shadowColor: '#333',
      },
    },
    data: normalizedData,
  }

  return {
    tooltip: {
      show: true,
    },
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    series: [seriesItem as unknown as echarts.SeriesOption],
  }
}
