import { describe, it, expect } from 'bun:test'
import { createCartesianChartOption } from '../../../src/charts/transformers/cartesian'
import { getLegendOption } from '../../../src/charts/transformers/legend'

describe('Responsive Chart Features', () => {
  const mockData = [
    { category: 'A', value: 10 },
    { category: 'B', value: 20 },
  ]

  describe('createCartesianChartOption', () => {
    it('should enable dataZoom in mobile mode', () => {
      const options = createCartesianChartOption(mockData, 'category', 'value', 'bar', {
        isMobile: true,
      })
      expect(options.dataZoom).toBeDefined()
      expect(options.dataZoom).toHaveLength(2) // slider + inside
    })

    it('should enable dataZoom when container width is small (< 600)', () => {
      const options = createCartesianChartOption(mockData, 'category', 'value', 'bar', {
        containerWidth: 500,
      })
      expect(options.dataZoom).toBeDefined()
    })

    it('should NOT enable dataZoom when container width is large (>= 600)', () => {
      const options = createCartesianChartOption(mockData, 'category', 'value', 'bar', {
        containerWidth: 800,
      })
      expect(options.dataZoom).toBeUndefined()
    })

    it('should auto-rotate axis labels in compact mode if not specified', () => {
      const options = createCartesianChartOption(mockData, 'category', 'value', 'bar', {
        isMobile: true,
      })
      const xAxis = Array.isArray(options.xAxis) ? options.xAxis[0] : options.xAxis
      expect(xAxis?.axisLabel?.rotate).toBe(45)
    })

    it('should respect user specified axis rotation even in compact mode', () => {
      const options = createCartesianChartOption(mockData, 'category', 'value', 'bar', {
        isMobile: true,
        xAxisLabelRotate: 90,
      })
      const xAxis = Array.isArray(options.xAxis) ? options.xAxis[0] : options.xAxis
      expect(xAxis?.axisLabel?.rotate).toBe(90)
    })

    it('should not enable dataZoom if axis is flipped', () => {
      // If flipped, we decided NOT to enable dataZoom (X-axis zoom) for now to avoid complexity
      const options = createCartesianChartOption(mockData, 'category', 'value', 'bar', {
        isMobile: true,
        flipAxis: true,
      })
      const dz = options.dataZoom
      if (dz) {
        expect(dz).toHaveLength(0)
      }
      else {
        expect(dz).toBeUndefined()
      }
    })
  })

  describe('getLegendOption', () => {
    it('should default legend position to bottom in compact mode', () => {
      const legend = getLegendOption({
        legend: true,
        isMobile: true,
      })
      expect(legend).toBeDefined()
      expect(legend?.bottom).toBe(0)
    })

    it('should keep legend position to top (default) in non-compact mode', () => {
      const legend = getLegendOption({
        legend: true,
        containerWidth: 1000,
      })
      expect(legend).toBeDefined()
      expect(legend?.top).toBe(0)
      expect(legend?.bottom).toBeUndefined()
    })

    it('should respect user specified position even in compact mode', () => {
      const legend = getLegendOption({
        legend: true,
        isMobile: true,
        legendPosition: 'left',
      })
      expect(legend).toBeDefined()
      expect(legend?.left).toBe(0)
      expect(legend?.bottom).toBeUndefined()
    })
  })
})
