import type { EChartsOption, LinesSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption } from './utils'
import * as R from 'remeda'

export interface LinesTransformerOptions extends BaseTransformerOptions {
  readonly x2Prop?: string
  readonly y2Prop?: string
  readonly seriesProp?: string
}

function asCoords(coords: readonly (readonly number[])[]): [number, number][] {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
  return coords as any
}

export function createLinesChartOption(
  data: BasesData,
  xProp: string,
  yProp: string,
  options?: LinesTransformerOptions,
): EChartsOption {
  const x2Prop = options?.x2Prop
  const y2Prop = options?.y2Prop
  const seriesProp = options?.seriesProp

  const xAxisLabel = options?.xAxisLabel ?? xProp
  const yAxisLabel = options?.yAxisLabel ?? yProp

  return (!x2Prop || !y2Prop)
    ? {}
    : (() => {
        // 1. Normalize Data
        const normalizedData = R.pipe(
          data,
          R.map((item) => {
            const x1 = Number(getNestedValue(
              item,
              xProp,
            ))
            const y1 = Number(getNestedValue(
              item,
              yProp,
            ))
            const x2 = Number(getNestedValue(
              item,
              x2Prop,
            ))
            const y2 = Number(getNestedValue(
              item,
              y2Prop,
            ))
            const series = seriesProp
              ? safeToString(getNestedValue(
                  item,
                  seriesProp,
                ))
              : yAxisLabel

            return (Number.isNaN(x1) || Number.isNaN(y1) || Number.isNaN(x2) || Number.isNaN(y2))
              ? null
              : { coords: asCoords([[x1,
                  y1],
                [x2,
                  y2]]),
                series }
          }),
          R.filter((d): d is Readonly<{ coords: [number, number][]
            series: string }> => d !== null),
        )

        // 2. Group by Series
        const groupedData = R.groupBy(
          normalizedData,
          d => d.series,
        )
        const seriesNames = Object.keys(groupedData)

        // 3. Build Series
        const seriesOptions: LinesSeriesOption[] = seriesNames.map((name) => {
          // @ts-expect-error - suppress strictNullChecks/type errors
          const seriesData = groupedData[name].map(d => ({
            coords: d.coords,
          }))

          return {
            type: 'lines',
            name: name,
            coordinateSystem: 'cartesian2d',
            data: seriesData,
            lineStyle: {
              width: 2,
              opacity: 0.6,
            },
          }
        })

        return {
          tooltip: {
            trigger: 'item',
          },
          xAxis: {
            type: 'value',
            name: xAxisLabel,
            splitLine: { show: false },
          },
          yAxis: {
            type: 'value',
            name: yAxisLabel,
            splitLine: { show: false },
          },
          series: seriesOptions,
          ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
        }
      })()
}
