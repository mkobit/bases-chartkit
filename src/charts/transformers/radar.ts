import type { EChartsOption, RadarSeriesOption } from 'echarts'
import type { BaseTransformerOptions, BasesData } from './base'
import { safeToString, getNestedValue, getLegendOption } from './utils'
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
  const seriesData = data.map((item) => {
    const nameRaw = getNestedValue(
      item,
      nameProp,
    )
    const name = nameRaw === undefined || nameRaw === null ? 'Unknown' : safeToString(nameRaw)
    const values = metricProps.map((prop) => {
      const val = Number(getNestedValue(
        item,
        prop,
      ))
      return Number.isNaN(val) ? 0 : val
    })
    return { value: values,
      name }
  })

  const radarIndicators = metricProps.map((prop, index) => {
    // `d.value` is built from this same `metricProps` array above, so it's
    // always exactly as long -- `?? 0` only satisfies noUncheckedIndexedAccess,
    // it's not covering a real out-of-range case.
    const { min, max } = computeIndicatorRange(seriesData.map(d => d.value[index] ?? 0))
    return { name: options?.metricLabels?.[prop] ?? prop, min, max }
  })

  const seriesItem: RadarSeriesOption = {
    type: 'radar',
    data: seriesData,
  }

  return {
    radar: {
      indicator: radarIndicators,
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

  // 1. Identify Indicators (Axes)
  const indicatorsList = R.pipe(
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

  // 2. Group data by Series
  // Explicitly type to help TS
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
        : valueProp // Use value prop name as default series name if no grouping
    },
  )

  const uniqueSeries = R.keys(groupedData)

  // 3. Build Data
  const seriesData = uniqueSeries.map((sName) => {
    const items = groupedData[sName] || []

    // Map items to indicator map
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

    // Create array matching indicatorsList order
    const values = indicatorsList.map((ind) => {
      const found = valueMap[ind]
      return found && !Number.isNaN(found.val) ? found.val : 0
    })

    return {
      value: values,
      name: sName,
    }
  })

  // 4. Construct Option
  const radarIndicators = indicatorsList.map((name, index) => {
    // Same as the wide-format builder above: `d.value` is always as long as
    // `indicatorsList`, so `?? 0` is only here for noUncheckedIndexedAccess.
    const { min, max } = computeIndicatorRange(seriesData.map(d => d.value[index] ?? 0))
    return { name, min, max }
  })

  const seriesItem: RadarSeriesOption = {
    type: 'radar',
    data: seriesData,
  }

  const opt: EChartsOption = {
    radar: {
      indicator: radarIndicators,
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
