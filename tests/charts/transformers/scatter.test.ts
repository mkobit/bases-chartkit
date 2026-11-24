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

function firstDatasetSource(option: EChartsOption): unknown {
  const dataset = Array.isArray(option.dataset) ? option.dataset[0] : option.dataset
  return dataset?.source
}

describe('createScatterChartOption', () => {
  const data = [
    { category: 'A', value: 10 },
    { category: 'B', value: 20 },
  ]

  it('should hide overlapping x-axis labels (large numeric categories)', () => {
    const option = createScatterChartOption(data, 'category', 'value')

    expect(firstXAxis(option).axisLabel?.hideOverlap).toBe(true)
  })

  it('should abbreviate visualMap handle labels to avoid overlap on large-value axes', () => {
    const option = createScatterChartOption(data, 'category', 'value', { sizeProp: 'value' })

    const visualMap = firstVisualMap(option)
    expect(visualMap).toBeDefined()
    expect(visualMap.formatter).toBe(formatCompactVisualMapLabel)
  })

  it('should use value xAxis with numeric data when x property is numeric', () => {
    const numericData = [
      { gdp: 50000, lifeExpectancy: 81.2 },
      { gdp: 12000, lifeExpectancy: 72.5 },
      { gdp: '35000', lifeExpectancy: 78.9 },
      { gdp: null, lifeExpectancy: 70.0 },
    ]
    const option = createScatterChartOption(numericData, 'gdp', 'lifeExpectancy')

    const xAxis = firstXAxis(option)
    expect(xAxis.type).toBe('value')
    expect('data' in xAxis).toBe(false)
    expect(firstDatasetSource(option)).toEqual([
      { x: 50000, y: 81.2, s: 'lifeExpectancy', rowIndex: 0 },
      { x: 12000, y: 72.5, s: 'lifeExpectancy', rowIndex: 1 },
      { x: 35000, y: 78.9, s: 'lifeExpectancy', rowIndex: 2 },
      { x: null, y: 70.0, s: 'lifeExpectancy', rowIndex: 3 },
    ])
  })

  it('should use category xAxis when x property is non-numeric or mixed', () => {
    const mixedData = [
      { label: 10, value: 5 },
      { label: 'B', value: 15 },
    ]
    const option = createScatterChartOption(mixedData, 'label', 'value')

    const xAxis = firstXAxis(option)
    expect(xAxis.type).toBe('category')
    if (xAxis.type === 'category') {
      expect(xAxis.data).toEqual(['10', 'B'])
    }
  })

  it('should use value xAxis for bubble charts with numeric x property', () => {
    const bubbleData = [
      { x: 40, y: 80, size: 100 },
      { x: 10, y: 65, size: 25 },
    ]
    const option = createScatterChartOption(bubbleData, 'x', 'y', { sizeProp: 'size' })

    expect(firstXAxis(option).type).toBe('value')
    expect(firstVisualMap(option)).toBeDefined()
    expect(firstDatasetSource(option)).toEqual([
      { x: 40, y: 80, s: 'y', size: 100, rowIndex: 0 },
      { x: 10, y: 65, s: 'y', size: 25, rowIndex: 1 },
    ])
  })
})
