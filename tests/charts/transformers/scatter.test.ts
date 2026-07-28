import { describe, it, expect } from 'bun:test'
import { createScatterChartOption } from '../../../src/charts/transformers/scatter'
import { formatCompactVisualMapLabel } from '../../../src/charts/transformers/utils'

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

        expect((option.xAxis as any).axisLabel?.hideOverlap).toBe(true)
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

        const visualMap = option.visualMap as { formatter?: unknown }
        expect(visualMap).toBeDefined()
        expect(visualMap.formatter).toBe(formatCompactVisualMapLabel)
      },
    )
  },
)
