import type { EChartsOption, RadarSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { getNestedValue, safeToString } from './bases-values'
import { getLegendOption } from './legend'
import * as R from 'remeda'

export interface RadarTransformerOptions extends BaseTransformerOptions {
  readonly seriesProp?: string
  readonly metricProps?: readonly string[]
  readonly metricLabels?: Readonly<Record<string, string>>
}

interface IndicatorRange {
  readonly min: number
  readonly max: number
}

interface RadarSeriesDatum {
  readonly name: string
  readonly value: readonly number[]
}

interface RadarIndicator {
  readonly name: string
  readonly min: number
  readonly max: number
}

// ECharts scales each radar axis independently, defaulting an unspecified
// max to the largest value ECharts happens to see for that axis -- so two
// metrics with very different natural ranges (e.g. a 0-20 metric next to a
// 0-10000 metric) end up implying false parity on the polygon. Auto-compute
// a real per-indicator range from the data instead of leaving it unscaled.
function computeIndicatorRange(values: readonly number[]): IndicatorRange {
  const rawMax = values.length > 0 ? Math.max(...values) : 10
  const rawMin = Math.min(0, values.length > 0 ? Math.min(...values) : 0)
  return { min: rawMin, max: rawMax > rawMin ? rawMax : rawMin + 10 }
}

export function createRadarChartOption(
  data: BasesData,
  indicatorProp: string,
  valueProp: string,
  options?: RadarTransformerOptions,
): EChartsOption {
  return options?.metricProps && options.metricProps.length > 0
    ? createWideFormatRadarOption(
        data,
        indicatorProp,
        options.metricProps,
        options,
      )
    : createLongFormatRadarOption(
        data,
        indicatorProp,
        valueProp,
        options,
      )
}

// Wide format: one row per entity with a column per metric (e.g. one row per
// character with Strength/Intelligence/Agility columns). nameProp identifies
// each series (polygon); metricProps become the radar's indicators (axes).
function createWideFormatRadarOption(
  data: BasesData,
  nameProp: string,
  metricProps: readonly string[],
  options?: RadarTransformerOptions,
): EChartsOption {
  const seriesData: readonly RadarSeriesDatum[] = data.map((item): RadarSeriesDatum => {
    const nameRaw = getNestedValue(
      item,
      nameProp,
    )
    const name = nameRaw === undefined || nameRaw === null ? 'Unknown' : safeToString(nameRaw)
    const values: readonly number[] = metricProps.map((prop) => {
      const val = Number(getNestedValue(
        item,
        prop,
      ))
      return Number.isNaN(val) ? 0 : val
    })
    return { value: values,
      name }
  })

  const radarIndicators: readonly RadarIndicator[] = metricProps.map((prop, index): RadarIndicator => {
    // `d.value` is built from this same `metricProps` array above, so it's
    // always exactly as long -- `?? 0` only satisfies noUncheckedIndexedAccess,
    // it's not covering a real out-of-range case.
    const { min, max } = computeIndicatorRange(seriesData.map(d => d.value[index] ?? 0))
    return { name: options?.metricLabels?.[prop] ?? prop, min, max }
  })

  const seriesItem: RadarSeriesOption = {
    type: 'radar',
    data: seriesData.map(d => ({ name: d.name,
      value: [...d.value] })),
  }

  return {
    radar: {
      indicator: [...radarIndicators],
    },
    series: [seriesItem],
    tooltip: {
      trigger: 'item',
    },
    ...(getLegendOption(options)
      ? {
          legend: {
            data: seriesData.map(d => d.name),
            ...getLegendOption(options),
          },
        }
      : {}),
  }
}

// Long format: one row per (series, indicator, value) triple — indicators are
// distinct values of indicatorProp, grouped into series by seriesProp.
function createLongFormatRadarOption(
  data: BasesData,
  indicatorProp: string,
  valueProp: string,
  options?: RadarTransformerOptions,
): EChartsOption {
  const seriesProp = options?.seriesProp

  const indicatorsList: readonly string[] = R.pipe(
    data,
    R.map((item) => {
      const valRaw = getNestedValue(
        item,
        indicatorProp,
      )
      return valRaw === undefined || valRaw === null ? 'Unknown' : safeToString(valRaw)
    }),
    R.unique(),
  )

  const groupedData: Record<string, BasesData> = R.groupBy(
    data,
    (item) => {
      return seriesProp
        ? (() => {
            const valRaw = getNestedValue(
              item,
              seriesProp,
            )
            return valRaw === undefined || valRaw === null ? 'Unknown' : safeToString(valRaw)
          })()
        // No grouping prop configured -- fall back to the value prop's own
        // name so every row lands in one series instead of an empty key.
        : valueProp
    },
  )

  const uniqueSeries: readonly string[] = R.keys(groupedData)

  const seriesData: readonly RadarSeriesDatum[] = uniqueSeries.map((sName): RadarSeriesDatum => {
    const items = groupedData[sName] || []

    const valueMap = R.pipe(
      items,
      R.map((item) => {
        const indRaw = getNestedValue(
          item,
          indicatorProp,
        )
        const indVal = indRaw === undefined || indRaw === null ? 'Unknown' : safeToString(indRaw)
        const val = Number(getNestedValue(
          item,
          valueProp,
        ))
        return { indVal,
          val }
      }),
      R.indexBy(x => x.indVal),
    )

    const values: readonly number[] = indicatorsList.map((ind) => {
      const found = valueMap[ind]
      return found && !Number.isNaN(found.val) ? found.val : 0
    })

    return {
      value: values,
      name: sName,
    }
  })

  const radarIndicators: readonly RadarIndicator[] = indicatorsList.map((name, index): RadarIndicator => {
    // Same as the wide-format builder above: `d.value` is always as long as
    // `indicatorsList`, so `?? 0` is only here for noUncheckedIndexedAccess.
    const { min, max } = computeIndicatorRange(seriesData.map(d => d.value[index] ?? 0))
    return { name, min, max }
  })

  const seriesItem: RadarSeriesOption = {
    type: 'radar',
    data: seriesData.map(d => ({ name: d.name,
      value: [...d.value] })),
  }

  const opt: EChartsOption = {
    radar: {
      indicator: [...radarIndicators],
    },
    series: [seriesItem],
    tooltip: {
      trigger: 'item',
    },
    ...(getLegendOption(options)
      ? {
          legend: {
            data: seriesData.map(d => d.name),
            ...getLegendOption(options),
          },
        }
      : {}),
  }

  return opt
}
