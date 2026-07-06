import { describe, it, expect } from 'bun:test'
import { createPolarScatterChartOption } from '../../src/charts/transformers/polar-scatter'
import type { BasesData } from '../../src/charts/transformers/base'
import type { ScatterSeriesOption } from 'echarts'

describe(
  'createPolarScatterChartOption',
  () => {
    const data: BasesData = [
      { angle: 'A',
        radius: 10,
        group: 'G1',
        size: 20 },
      { angle: 'B',
        radius: 20,
        group: 'G1',
        size: 15 },
      { angle: 'C',
        radius: 30,
        group: 'G2',
        size: 25 },
    ]

    it(
      'should create a basic polar scatter chart',
      () => {
        const option = createPolarScatterChartOption(
          data,
          'angle',
          'radius',
        )

        expect(option.polar).toBeDefined()
        expect(option.angleAxis).toBeDefined()
        expect(option.radiusAxis).toBeDefined()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((option.angleAxis as any).type).toBe('category')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((option.radiusAxis as any).type).toBe('value')
        expect(option.series).toBeDefined()
        expect(option.series).toHaveLength(1)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const series = (option.series as any)[0] as ScatterSeriesOption
        expect(series.type).toBe('scatter')
        expect(series.coordinateSystem).toBe('polar')
        expect(series.encode).toEqual({
          angle: 'x',
          radius: 'y',
          tooltip: ['x',
            'y',
            's'],
        })
      },
    )

    it(
      'should handle series grouping',
      () => {
        const option = createPolarScatterChartOption(
          data,
          'angle',
          'radius',
          {
            seriesProp: 'group',
          },
        )

        expect(option.series).toHaveLength(2) // G1, G2

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s1 = (option.series as any)[0] as ScatterSeriesOption
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s2 = (option.series as any)[1] as ScatterSeriesOption

        expect(s1.name).toBe('G1')
        expect(s2.name).toBe('G2')
      },
    )

    it(
      'should handle size property and visual map',
      () => {
        const option = createPolarScatterChartOption(
          data,
          'angle',
          'radius',
          {
            sizeProp: 'size',
          },
        )

        expect(option.visualMap).toBeDefined()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const series = (option.series as any)[0] as ScatterSeriesOption
        expect(series.encode?.tooltip).toContain('size')
      },
    )

    it(
      'should hide overlapping angle-axis labels (large numeric categories)',
      () => {
        const option = createPolarScatterChartOption(
          data,
          'angle',
          'radius',
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((option.angleAxis as any).axisLabel?.hideOverlap).toBe(true)
      },
    )
  },
)
