import { describe, it, expect } from 'bun:test'
import { createCartesianChartOption } from '../src/charts/transformers/cartesian'
describe(
  'Axis Features',
  () => {
    const mockData = [
      { category: 'A',
        value: 10,
        group: 'G1' },
      { category: 'B',
        value: 20,
        group: 'G1' },
    ]
    const manyCategoriesData = Array.from(
      { length: 30 },
      (_, i) => ({ category: `Day ${i}`,
        value: i,
        group: 'G1' }),
    )
    describe(
      'Cartesian Chart (Bar/Line)',
      () => {
        it(
          'should support axis labels override',
          () => {
            const options = createCartesianChartOption(
              mockData,
              'category',
              'value',
              'bar',
              {
                xAxisLabel: 'Custom X',
                yAxisLabel: 'Custom Y',
              },
            )
            const xAxis = Array.isArray(options.xAxis) ? options.xAxis[0] : options.xAxis
            const yAxis = Array.isArray(options.yAxis) ? options.yAxis[0] : options.yAxis
            expect(xAxis).toHaveProperty(
              'name',
              'Custom X',
            )
            expect(yAxis).toHaveProperty(
              'name',
              'Custom Y',
            )
          },
        )
        it(
          'should support axis rotation',
          () => {
            const options = createCartesianChartOption(
              mockData,
              'category',
              'value',
              'bar',
              {
                xAxisLabelRotate: 45,
              },
            )
            const xAxis = Array.isArray(options.xAxis) ? options.xAxis[0] : options.xAxis
            expect(xAxis?.axisLabel?.rotate).toBe(45)
          },
        )
        it(
          'should render every x-axis label (interval: 0) for a short category list',
          () => {
            const options = createCartesianChartOption(
              mockData,
              'category',
              'value',
              'line',
            )
            const xAxis = Array.isArray(options.xAxis) ? options.xAxis[0] : options.xAxis
            expect(xAxis?.axisLabel?.interval).toBe(0)
            expect(xAxis?.axisLabel?.rotate).toBe(0)
          },
        )
        it(
          'should auto-thin and rotate x-axis labels once the category count would overlap at interval: 0',
          () => {
            const options = createCartesianChartOption(
              manyCategoriesData,
              'category',
              'value',
              'line',
            )
            const xAxis = Array.isArray(options.xAxis) ? options.xAxis[0] : options.xAxis
            expect(xAxis?.axisLabel?.interval).toBe('auto')
            expect(xAxis?.axisLabel?.rotate).toBe(45)
          },
        )
        it(
          'should let an explicit xAxisLabelRotate override the many-category default even when auto-thinning',
          () => {
            const options = createCartesianChartOption(
              manyCategoriesData,
              'category',
              'value',
              'line',
              { xAxisLabelRotate: 90 },
            )
            const xAxis = Array.isArray(options.xAxis) ? options.xAxis[0] : options.xAxis
            expect(xAxis?.axisLabel?.interval).toBe('auto')
            expect(xAxis?.axisLabel?.rotate).toBe(90)
          },
        )
        it(
          'should support flip axis',
          () => {
            const options = createCartesianChartOption(
              mockData,
              'category',
              'value',
              'bar',
              {
                flipAxis: true,
                xAxisLabel: 'Custom X',
                yAxisLabel: 'Custom Y',
              },
            )
            const xAxis = Array.isArray(options.xAxis) ? options.xAxis[0] : options.xAxis
            const yAxis = Array.isArray(options.yAxis) ? options.yAxis[0] : options.yAxis
            // When flipped:
            // X Axis should be Value type and have Y Label name (conceptually Y becomes horizontal)
            expect(xAxis).toHaveProperty(
              'type',
              'value',
            )
            expect(xAxis).toHaveProperty(
              'name',
              'Custom Y',
            )
            // Y Axis should be Category type and have X Label name
            expect(yAxis).toHaveProperty(
              'type',
              'category',
            )
            expect(yAxis).toHaveProperty(
              'name',
              'Custom X',
            )
          },
        )
      },
    )
    // Flip axis tests for Scatter/Heatmap removed as support is currently disabled
  },
)
