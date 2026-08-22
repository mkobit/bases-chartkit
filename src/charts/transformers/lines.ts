import type { EChartsOption, LinesSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, safeToString } from './bases-values'
import { getLegendOption } from './legend'
import * as R from 'remeda'

export interface LinesTransformerOptions extends BaseTransformerOptions {
  readonly x2Prop?: string
  readonly y2Prop?: string
  readonly seriesProp?: string
}

type NormalizedSegment = Readonly<{
  x1: number
  y1: number
  x2: number
  y2: number
  series: string
}>

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
        const normalizedData: ReadonlyArray<NormalizedSegment> = R.pipe(
          data,
          R.map((item): NormalizedSegment | null => {
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
              : { x1,
                  y1,
                  x2,
                  y2,
                  series }
          }),
          R.filter((d): d is NormalizedSegment => d !== null),
        )

        // 'lines' series data only exposes a scalar `value` dimension to
        // ECharts, never the coords themselves, so it never contributes to
        // value-axis auto-scaling. With no other series present, both axes
        // silently default to [0, 1], clipping most segments off-canvas.
        // Pin min/max to the real coordinate range explicitly.
        const allX: readonly number[] = normalizedData.flatMap((d): readonly number[] => [d.x1, d.x2])
        const allY: readonly number[] = normalizedData.flatMap((d): readonly number[] => [d.y1, d.y2])
        const axisRangeX = allX.length === 0
          ? undefined
          : { min: Math.min(...allX),
              max: Math.max(...allX) }
        const axisRangeY = allY.length === 0
          ? undefined
          : { min: Math.min(...allY),
              max: Math.max(...allY) }

        const groupedData = R.groupBy(
          normalizedData,
          d => d.series,
        )
        const seriesNames: readonly string[] = Object.keys(groupedData)

        const seriesOptions: ReadonlyArray<LinesSeriesOption> = seriesNames.map((name): LinesSeriesOption => {
          // ECharts' `lines` data wants a fresh, mutable `number[][]` per segment
          // (LinesCoords); build it here at the option boundary.
          const seriesData: ReadonlyArray<{ readonly coords: number[][] }> = (groupedData[name] ?? []).map(d => ({
            coords: [[d.x1, d.y1], [d.x2, d.y2]],
          }))

          return {
            type: 'lines',
            name: name,
            coordinateSystem: 'cartesian2d',
            data: [...seriesData],
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
            ...axisRangeX,
          },
          yAxis: {
            type: 'value',
            name: yAxisLabel,
            splitLine: { show: false },
            ...axisRangeY,
          },
          series: [...seriesOptions],
          ...(getLegendOption(options) ? { legend: getLegendOption(options) } : {}),
        }
      })()
}
