import type { EChartsOption, ParallelSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, safeToString, getLegendOption } from './utils'
import * as R from 'remeda'

export interface ParallelTransformerOptions extends BaseTransformerOptions {
  readonly seriesProp?: string
  readonly dimensionLabels?: Readonly<Record<string, string>>
}

// ECharts parallelAxis type is complex union
function asParallelAxis(axis: unknown): EChartsOption['parallelAxis'] {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- ECharts parallelAxis type is a complex union; bridge to the shape we construct.
  return axis as EChartsOption['parallelAxis']
}

export function createParallelChartOption(
  data: BasesData,
  dimensionsStr: string,
  options?: ParallelTransformerOptions,
): EChartsOption {
  // 1. Parse dimensions
  const dims = dimensionsStr.split(',').map(s => s.trim()).filter(s => s.length > 0)

  return dims.length === 0
    ? {
        title: {
          text: 'No dimensions specified',
        },
      }
    : (() => {
        const seriesProp = options?.seriesProp

        // 2. Prepare Parallel Axis
        // Use standard map to avoid remeda type issues with indexed map in strict mode
        const parallelAxis = dims.map((dim, index) => {
          // Collect all values for this dimension to infer type
          const values = R.map(
            data,
            item => getNestedValue(
              item,
              dim,
            ),
          )

          // Check if all non-null values are numeric
          const nonNullValues = R.filter(
            values,
            v => v !== null && v !== undefined && v !== '',
          )
          const isNumeric = nonNullValues.every(v => !Number.isNaN(Number(v)))

          const name = options?.dimensionLabels?.[dim] ?? dim

          return (isNumeric && nonNullValues.length > 0)
            ? {
                dim: index,
                name,
                type: 'value' as const,
              }
            : (() => {
                const uniqueVals = R.pipe(
                  nonNullValues,
                  R.map(safeToString),
                  R.unique(),
                )
                return {
                  dim: index,
                  name,
                  type: 'category' as const,
                  data: uniqueVals,
                }
              })()
        })

        // 3. Prepare Data
        // Group by series first
        const seriesDataMap = R.pipe(
          data,
          R.groupBy((item) => {
            return seriesProp
              ? (() => {
                  const sValRaw = getNestedValue(
                    item,
                    seriesProp,
                  )
                  return (sValRaw !== undefined && sValRaw !== null) ? safeToString(sValRaw) : 'Unknown'
                })()
              : 'Series 1'
          }),
          R.mapValues(items =>
            R.map(
              items,
              (item) => {
                return R.map(
                  dims,
                  (dim, index) => {
                    const valRaw = getNestedValue(
                      item,
                      dim,
                    )

                    return (valRaw === null || valRaw === undefined || valRaw === '')
                      ? null
                      : (() => {
                          // Look up by index, not by resolved axis name — the
                          // axis `name` may now be a friendly displayName that
                          // no longer matches the raw `dim` property path.
                          const axis = parallelAxis[index]
                          const isNum = axis?.type === 'value'
                          return isNum ? Number(valRaw) : safeToString(valRaw)
                        })()
                  },
                )
              },
            )),
        )

        const series: ParallelSeriesOption[] = R.pipe(
          seriesDataMap,
          R.entries(),
          R.map(([name,
            sData]) => {
            return {
              name: name,
              type: 'parallel' as const,
              lineStyle: {
                width: 2, // make lines visible
              },
              data: sData,
            }
          }),
        )

        const option: EChartsOption = {
          parallel: {
            left: '5%',
            right: '13%',
            bottom: '10%',
            top: '20%',
            parallelAxisDefault: {
              type: 'value',
              nameLocation: 'end',
              nameGap: 20,
            },
          },
          parallelAxis: asParallelAxis(parallelAxis),
          series: series,
          ...(getLegendOption(options)
            ? {
                legend: {
                  data: R.keys(seriesDataMap),
                  ...getLegendOption(options),
                },
              }
            : {}),
        }

        return option
      })()
}
