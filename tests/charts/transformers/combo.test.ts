import { describe, it, expect } from 'bun:test'
import { createComboChartOption } from '../../../src/charts/transformers/combo'
import type { BarSeriesOption, EChartsOption, LineSeriesOption, ScatterSeriesOption, YAXisComponentOption } from 'echarts'
import { isRecord } from '../../../src/charts/transformers/bases-values'

function getSeriesList(option: EChartsOption): readonly (BarSeriesOption | LineSeriesOption | ScatterSeriesOption)[] {
  const series = Array.isArray(option.series) ? option.series : option.series === undefined ? [] : [option.series]
  return series.flatMap(s => (s.type === 'bar' || s.type === 'line' || s.type === 'scatter') ? [s] : [])
}

function getYAxes(option: EChartsOption): readonly YAXisComponentOption[] {
  return Array.isArray(option.yAxis) ? option.yAxis : option.yAxis === undefined ? [] : [option.yAxis]
}

function isTooltipFormatter(value: unknown): value is (params: unknown) => string {
  return typeof value === 'function'
}

describe('createComboChartOption', () => {
  const sampleData = [
    { quarter: 'Q1', revenue: 100, target: 90, region: 'East' },
    { quarter: 'Q2', revenue: 120, target: 110, region: 'East' },
    { quarter: 'Q3', revenue: 150, target: 130, region: 'East' },
    { quarter: 'Q4', revenue: 180, target: 160, region: 'East' },
  ]

  it('generates a primary bar series and an overlay line series on shared x-axis', () => {
    const option = createComboChartOption(sampleData, 'quarter', 'revenue', {
      overlayProp: 'target',
      overlayType: 'line',
    })

    const series = getSeriesList(option)
    expect(series).toHaveLength(2)

    const primary = series[0]
    const overlay = series[1]
    expect(primary).toBeDefined()
    expect(overlay).toBeDefined()
    if (!primary || !overlay) {
      return
    }

    expect(primary.type).toBe('bar')
    expect(primary.name).toBe('revenue')
    expect(primary.data).toEqual([100, 120, 150, 180])

    expect(overlay.type).toBe('line')
    expect(overlay.name).toBe('target')
    expect(overlay.data).toEqual([90, 110, 130, 160])
  })

  it('configures dual y-axes with aligned ticks when overlayDualAxis is true', () => {
    const option = createComboChartOption(sampleData, 'quarter', 'revenue', {
      overlayProp: 'target',
      overlayDualAxis: true,
      yAxisLabel: 'Revenue ($)',
      overlayYAxisLabel: 'Target ($)',
    })

    const yAxes = getYAxes(option)
    expect(yAxes).toHaveLength(2)

    const left = yAxes[0]
    const right = yAxes[1]
    expect(left).toBeDefined()
    expect(right).toBeDefined()
    if (!left || !right) {
      return
    }

    expect(left.position).toBe('left')
    expect(left.name).toBe('Revenue ($)')
    if ('alignTicks' in left) {
      expect(left.alignTicks).toBe(true)
    }

    expect(right.position).toBe('right')
    expect(right.name).toBe('Target ($)')
    if ('alignTicks' in right) {
      expect(right.alignTicks).toBe(true)
    }

    const series = getSeriesList(option)
    const primary = series[0]
    const overlay = series[1]
    expect(primary).toBeDefined()
    expect(overlay).toBeDefined()
    if (!primary || !overlay) {
      return
    }
    expect(primary.yAxisIndex).toBe(0)
    expect(overlay.yAxisIndex).toBe(1)
  })

  it('uses a single left y-axis when overlayDualAxis is false', () => {
    const option = createComboChartOption(sampleData, 'quarter', 'revenue', {
      overlayProp: 'target',
      overlayDualAxis: false,
    })

    const yAxes = getYAxes(option)
    expect(yAxes).toHaveLength(1)
    const axis = yAxes[0]
    expect(axis).toBeDefined()
    if (!axis) {
      return
    }
    expect(axis.position).toBe('left')

    const series = getSeriesList(option)
    const primary = series[0]
    const overlay = series[1]
    expect(primary).toBeDefined()
    expect(overlay).toBeDefined()
    if (!primary || !overlay) {
      return
    }
    expect(primary.yAxisIndex).toBe(0)
    expect(overlay.yAxisIndex).toBe(0)
  })

  it('supports grouping and stacking primary series while keeping overlay independent', () => {
    const multiRegionData = [
      { quarter: 'Q1', revenue: 100, target: 220, region: 'East' },
      { quarter: 'Q1', revenue: 120, target: 220, region: 'West' },
      { quarter: 'Q2', revenue: 110, target: 250, region: 'East' },
      { quarter: 'Q2', revenue: 140, target: 250, region: 'West' },
    ]

    const option = createComboChartOption(multiRegionData, 'quarter', 'revenue', {
      seriesProp: 'region',
      primaryStack: true,
      overlayProp: 'target',
      overlayType: 'line',
    })

    const series = getSeriesList(option)
    expect(series).toHaveLength(3)

    const eastBar = series[0]
    const westBar = series[1]
    const overlay = series[2]
    expect(eastBar).toBeDefined()
    expect(westBar).toBeDefined()
    expect(overlay).toBeDefined()
    if (!eastBar || !westBar || !overlay) {
      return
    }

    expect(eastBar.name).toBe('East')
    expect(eastBar.type).toBe('bar')
    expect(eastBar.stack).toBe('primary_total')
    expect(eastBar.data).toEqual([100, 110])

    expect(westBar.name).toBe('West')
    expect(westBar.type).toBe('bar')
    expect(westBar.stack).toBe('primary_total')
    expect(westBar.data).toEqual([120, 140])

    expect(overlay.name).toBe('target')
    expect(overlay.type).toBe('line')
    expect(overlay.stack).toBeUndefined()
    expect(overlay.data).toEqual([220, 250])
  })

  it('supports scatter overlay series', () => {
    const option = createComboChartOption(sampleData, 'quarter', 'revenue', {
      overlayProp: 'target',
      overlayType: 'scatter',
    })

    const series = getSeriesList(option)
    const overlay = series[1]
    expect(overlay).toBeDefined()
    if (!overlay) {
      return
    }
    expect(overlay.type).toBe('scatter')
  })

  it('supports line primary series with bar overlay', () => {
    const option = createComboChartOption(sampleData, 'quarter', 'revenue', {
      primaryType: 'line',
      overlayProp: 'target',
      overlayType: 'bar',
    })

    const series = getSeriesList(option)
    const primary = series[0]
    const overlay = series[1]
    expect(primary).toBeDefined()
    expect(overlay).toBeDefined()
    if (!primary || !overlay) {
      return
    }
    expect(primary.type).toBe('line')
    expect(overlay.type).toBe('bar')
  })

  it('formats tooltips with axis trigger including marker and value', () => {
    const option = createComboChartOption(sampleData, 'quarter', 'revenue', {
      overlayProp: 'target',
      xAxisLabel: 'Period',
    })

    expect(isRecord(option.tooltip)).toBe(true)
    if (!isRecord(option.tooltip)) {
      return
    }
    expect(option.tooltip.trigger).toBe('axis')

    const formatter = option.tooltip.formatter
    expect(isTooltipFormatter(formatter)).toBe(true)
    if (isTooltipFormatter(formatter)) {
      const mockParams = [
        { seriesName: 'Revenue', marker: '● ', value: { x: 'Q1', y: 100 } },
        { seriesName: 'Target', marker: '▲ ', value: ['Q1', 90] },
      ]
      const rendered = formatter(mockParams)
      expect(rendered).toContain('Period: Q1')
      expect(rendered).toContain('Revenue: 100')
      expect(rendered).toContain('Target: 90')
    }
  })
})
