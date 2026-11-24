import { describe, it, expect } from 'bun:test'
import * as echarts from 'echarts'
import { createCartesianChartOption } from '../src/charts/transformers/cartesian'
import { createHistogramChartOption } from '../src/charts/transformers/histogram'
import { createPictorialBarChartOption } from '../src/charts/transformers/pictorial-bar'
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
          'sets interval: 0 for <= 15 rotated categories and omits interval: 0 (uses auto) for > 15 dense categories',
          () => {
            const twelveDates = Array.from({ length: 12 }, (_, i) => ({
              Date: `2024-${String(i + 1).padStart(2, '0')}-01`,
              Revenue: 100 + i * 10,
            }))
            const rotatedTwelveOpt = createCartesianChartOption(twelveDates, 'Date', 'Revenue', 'line', {
              areaStyle: true,
              containerWidth: 668,
            })
            const rotatedTwelveX = Array.isArray(rotatedTwelveOpt.xAxis) ? rotatedTwelveOpt.xAxis[0] : rotatedTwelveOpt.xAxis
            expect(rotatedTwelveX?.axisLabel?.rotate).toBe(45)
            expect(rotatedTwelveX?.axisLabel?.interval).toBe(0)

            const explicitRotatedTenOpt = createCartesianChartOption(twelveDates.slice(0, 10), 'Date', 'Revenue', 'bar', {
              xAxisLabelRotate: 45,
              containerWidth: 668,
            })
            const explicitRotatedTenX = Array.isArray(explicitRotatedTenOpt.xAxis)
              ? explicitRotatedTenOpt.xAxis[0]
              : explicitRotatedTenOpt.xAxis
            expect(explicitRotatedTenX?.axisLabel?.rotate).toBe(45)
            expect(explicitRotatedTenX?.axisLabel?.interval).toBe(0)

            const twentyFiveDates = Array.from({ length: 25 }, (_, i) => ({
              Date: `2024-01-${String(i + 1).padStart(2, '0')}`,
              Revenue: 100 + i * 10,
            }))
            const denseAutoOpt = createCartesianChartOption(twentyFiveDates, 'Date', 'Revenue', 'line', {
              areaStyle: true,
              containerWidth: 668,
            })
            const denseAutoX = Array.isArray(denseAutoOpt.xAxis) ? denseAutoOpt.xAxis[0] : denseAutoOpt.xAxis
            expect(denseAutoX?.axisLabel?.rotate).toBe(45)
            expect(denseAutoX?.axisLabel?.interval).not.toBe(0)
            expect(denseAutoX?.axisLabel?.interval).toBe('auto')

            const denseExplicitOpt = createCartesianChartOption(twentyFiveDates, 'Date', 'Revenue', 'line', {
              areaStyle: true,
              xAxisLabelRotate: 45,
              containerWidth: 668,
            })
            const denseExplicitX = Array.isArray(denseExplicitOpt.xAxis) ? denseExplicitOpt.xAxis[0] : denseExplicitOpt.xAxis
            expect(denseExplicitX?.axisLabel?.rotate).toBe(45)
            expect(denseExplicitX?.axisLabel?.interval).not.toBe(0)
            expect(denseExplicitX?.axisLabel?.interval).toBe('auto')
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
    describe(
      'SVG Layout Bounds and Overlap Prevention',
      () => {
        function assertSvgTextWithinCanvas(svg: string, width = 668, height = 501): void {
          const textTagPattern = /<text\b([^>]*)>(.*?)<\/text>/g
          for (const match of svg.matchAll(textTagPattern)) {
            const attrs = match[1] ?? ''
            const rawText = (match[2] ?? '').replaceAll('&amp;', '&')
            if (rawText.length === 0) {
              continue
            }
            const anchorMatch = attrs.match(/text-anchor="(start|middle|end)"/)
            const anchor = anchorMatch?.[1] ?? 'start'
            const xMatch = attrs.match(/\bx="([^"]+)"/)
            const yMatch = attrs.match(/\by="([^"]+)"/)
            const lxBase = xMatch ? Number(xMatch[1]) : 0
            const lyBase = yMatch ? Number(yMatch[1]) : 0
            const w = rawText.length * 6.2
            const h = 12
            const lx0 = lxBase + (anchor === 'start' ? 0 : anchor === 'middle' ? -w / 2 : -w)
            const lx1 = lx0 + w
            const ly0 = lyBase - h / 2
            const ly1 = lyBase + h / 2

            const matrixMatch = attrs.match(/transform="matrix\(([^)]+)\)"/)
            const translateMatch = attrs.match(/transform="translate\(([^)]+)\)"/)
            const [a, b, c, d, tx, ty] = matrixMatch && matrixMatch[1]
              ? matrixMatch[1].split(/[,\s]+/).map(Number)
              : translateMatch && translateMatch[1]
                ? [1, 0, 0, 1, ...translateMatch[1].split(/[,\s]+/).map(Number)]
                : [1, 0, 0, 1, 0, 0]

            const corners = [
              [lx0, ly0],
              [lx1, ly0],
              [lx0, ly1],
              [lx1, ly1],
            ] as const
            for (const [cx, cy] of corners) {
              const px = (a ?? 1) * cx + (c ?? 0) * cy + (tx ?? 0)
              const py = (b ?? 0) * cx + (d ?? 1) * cy + (ty ?? 0)
              expect(px).toBeGreaterThanOrEqual(0)
              expect(px).toBeLessThanOrEqual(width)
              expect(py).toBeGreaterThanOrEqual(0)
              expect(py).toBeLessThanOrEqual(height)
            }
          }
        }

        function renderAndCheckSvg(option: echarts.EChartsOption, width = 668, height = 501): string {
          const chart = echarts.init(null, undefined, { renderer: 'svg', ssr: true, width, height })
          try {
            chart.setOption(option)
            const svg = chart.renderToSVGString()
            assertSvgTextWithinCanvas(svg, width, height)
            return svg
          }
          finally {
            chart.dispose()
          }
        }

        it(
          'keeps long X-axis names and rotated labels inside canvas margins on cartesian charts',
          () => {
            const areaFormulaData = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December',
            ].map((month, i) => ({
              FormattedDate: `${month} 01, 2024`,
              Revenue: 50_000 + i * 2_000,
              Region: 'North',
            }))
            const areaFormulaSvg = renderAndCheckSvg(
              createCartesianChartOption(areaFormulaData, 'FormattedDate', 'Revenue', 'line', {
                areaStyle: true,
                seriesProp: 'Region',
                legend: true,
                containerWidth: 668,
              }),
            )
            expect(areaFormulaSvg).toContain('>FormattedDate<')
            expect(areaFormulaSvg).toContain('September 01, 2024')

            const barDepts = [
              'Engineering', 'Sales', 'Support', 'Legal', 'Operations',
              'Design', 'IT', 'Security', 'Infrastructure', 'Compliance',
            ].map((dept, i) => ({ Department: dept, Spend: (i + 1) * 20_000 }))
            const barRotatedSvg = renderAndCheckSvg(
              createCartesianChartOption(barDepts, 'Department', 'Spend', 'bar', {
                legend: true,
                xAxisLabelRotate: 45,
                containerWidth: 668,
              }),
            )
            expect(barRotatedSvg).toContain('>Department<')
            expect(barRotatedSvg).toContain('Infrastructure')
            expect(barRotatedSvg).toContain('Compliance')

            const flippedSvg = renderAndCheckSvg(
              createCartesianChartOption(areaFormulaData.slice(0, 4), 'FormattedDate', 'Revenue', 'line', {
                legend: true,
                flipAxis: true,
                containerWidth: 668,
              }),
            )
            expect(flippedSvg).toContain('>Revenue<')
          },
        )

        it(
          'keeps axis names and category labels unclipped on pictorial bar and histogram charts',
          () => {
            const picDepts = [
              'Sales', 'Marketing', 'Support', 'Finance', 'Operations',
              'Design', 'IT', 'Research', 'Infrastructure', 'Product Management',
            ].map((dept, i) => ({ Department: dept, Spend: (i + 1) * 20_000 }))
            const picSvg = renderAndCheckSvg(
              createPictorialBarChartOption(picDepts, 'Department', 'Spend', {
                legend: true,
                containerWidth: 668,
              }),
            )
            expect(picSvg).toContain('>Department<')
            expect(picSvg).toContain('Product Management')

            const scores = Array.from({ length: 100 }, (_, i) => ({ Score: i }))
            const histSvg = renderAndCheckSvg(
              createHistogramChartOption(scores, 'Score', {
                xAxisLabel: 'Score',
                yAxisLabel: 'Frequency',
                containerWidth: 668,
              }),
            )
            expect(histSvg).toContain('>Score<')
          },
        )
      },
    )
  },
)
