import { describe, it, expect } from 'bun:test'
import type { EChartsOption, VisualMapComponentOption, XAXisComponentOption } from 'echarts'
import { createScatterChartOption } from '../../../src/charts/transformers/scatter'
import { formatCompactVisualMapLabel } from '../../../src/charts/transformers/visual-map'

// EChartsOption['xAxis'] / ['visualMap'] can each be a single option or an
// array; splitting that narrows to the component option without any cast.
function firstXAxis(option: EChartsOption): XAXisComponentOption {
  const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
  if (xAxis === undefined) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error('expected an xAxis')
  }
  return xAxis
}

function firstVisualMap(option: EChartsOption): VisualMapComponentOption {
  const visualMap = Array.isArray(option.visualMap) ? option.visualMap[0] : option.visualMap
  if (visualMap === undefined) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error('expected a visualMap')
  }
  return visualMap
}

describe(
  'createScatterChartOption',
  () => {
    const data = [
      { category: 'A',
        value: 10 },
      { category: 'B',
        value: 20 },
    ]

    it(
      'should hide overlapping x-axis labels (large numeric categories)',
      () => {
        const option = createScatterChartOption(
          data,
          'category',
          'value',
        )

        expect(firstXAxis(option).axisLabel?.hideOverlap).toBe(true)
      },
    )

    it(
      'should abbreviate visualMap handle labels to avoid overlap on large-value axes',
      () => {
        const option = createScatterChartOption(
          data,
          'category',
          'value',
          { sizeProp: 'value' },
        )

        const visualMap = firstVisualMap(option)
        expect(visualMap).toBeDefined()
        expect(visualMap.formatter).toBe(formatCompactVisualMapLabel)
      },
    )
  },
)
