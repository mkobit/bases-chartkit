import { describe, it, expect } from 'bun:test'
import { createScatterChartOption } from '../../../src/charts/transformers/scatter'

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((option.xAxis as any).axisLabel?.hideOverlap).toBe(true)
      },
    )
  },
)
