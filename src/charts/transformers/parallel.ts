import type { EChartsOption, ParallelSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, safeToString, getLegendOption } from './utils'
import * as R from 'remeda'

export interface ParallelTransformerOptions extends BaseTransformerOptions {
  readonly seriesProp?: string
  readonly dimensionLabels?: Readonly<Record<string, string>>
}

type ParallelAxisSpec = Readonly<{
  dim: number
  name: string
  type: 'value' | 'category'
  data?: readonly string[]
}>

type ParallelRow = ReadonlyArray<number | string | null>

function asParallelAxis(axis: unknown): EChartsOption['parallelAxis'] {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- ECharts parallelAxis type is a complex union; bridge to the shape we construct.
  return axis as EChartsOption['parallelAxis']
}

export function createParallelChartOption(
  data: BasesData,
  dimensionsStr: string,
  options?: ParallelTransformerOptions,
): EChartsOption {
  const dims: readonly string[] = dimensionsStr.split(',').map(s => s.trim()).filter(s => s.length > 0)

  return dims.length === 0
    ? {
        title: {
          text: 'No dimensions specified',
        },
      }
    : (() => {
        const seriesProp = options?.seriesProp

        // Use standard map to avoid remeda type issues with indexed map in strict mode
        const parallelAxis: readonly ParallelAxisSpec[] = dims.map((dim, index): ParallelAxisSpec => {
          const values: readonly unknown[] = R.map(
            data,
            item => getNestedValue(
              item,
              dim,
            ),
          )

          const nonNullValues: readonly unknown[] = R.filter(
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
                const uniqueVals: readonly string[] = R.pipe(
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
          R.mapValues((items: BasesData): ReadonlyArray<ParallelRow> =>
            R.map(
              items,
              (item): ParallelRow => {
                return R.map(
                  dims,
                  (dim, index): number | string | null => {
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

        const series: ReadonlyArray<ParallelSeriesOption> = R.map(
          R.keys(seriesDataMap),
          (name): ParallelSeriesOption => {
            const sData = seriesDataMap[name] ?? []
            return {
              name: name,
              type: 'parallel' as const,
              lineStyle: {
                width: 2,
              },
              // ECharts wants a fresh mutable row array per line; build it here
              // at the option boundary from the readonly pipeline rows.
              // eslint-disable-next-line functional/prefer-immutable-types -- genuine ECharts mutable-array boundary, see comment above.
              data: sData.map(row => [...row]),
              // Without this, ECharts' default dimension inference flags only
              // the LAST axis column as `defaultedTooltip` (confirmed live:
              // hovering any point along a 3-axis row's line showed only the
              // 3rd axis's value, same defaultedTooltip fallback bug fixed
              // for candlestick's OHLC dims -- see candlestick.ts). Must use
              // raw numeric column indices, not the 'dim0'/'dim1'/... names
              // ECharts assigns for display -- those names don't exist yet
              // when encode is resolved (no `dimensions:` array is declared
              // on this series), so `dataDimNameMap.get('dim0')` in
              // createDimensions.js's encodeDefMap loop returns undefined
              // and the string form silently resolves to nothing (confirmed
              // live: string form left every dim's otherDims empty, same as
              // having no encode.tooltip at all).
              encode: {
                tooltip: dims.map((_, index) => index),
              },
            }
          },
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
          series: [...series],
          tooltip: {
            trigger: 'item',
          },
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
