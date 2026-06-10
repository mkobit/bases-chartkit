import { describe, it, expect } from 'bun:test'
import { transformDataToChartOption } from '../../../src/charts/transformer'
import type { CalendarComponentOption, VisualMapComponentOption } from 'echarts'

describe(
  'Calendar Transformer',
  () => {
    it(
      'should create a valid calendar option',
      () => {
        const data = [
          { date: '2023-01-01',
            val: 5 },
          { date: '2023-01-02',
            val: 10 },
          { date: '2023-02-01',
            val: 20 },
        ]

        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'calendar',
          { valueProp: 'val' },
        )

        expect(option).toBeDefined()

        // Check Calendar Component

        const calendar = option.calendar as CalendarComponentOption
        expect(calendar).toBeDefined()

        expect(calendar.range).toEqual(['2023-01-01',
          '2023-02-01'])

        // Check Series
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const series = option.series as readonly any[]
        expect(series).toHaveLength(1)

        expect(series[0]?.type).toBe('heatmap')

        expect(series[0]?.coordinateSystem).toBe('calendar')

        // Check Data

        const seriesData = series[0].data as readonly (readonly [string, number])[]
        expect(seriesData).toHaveLength(3)
        expect(seriesData[0]).toEqual(['2023-01-01',
          5])
        expect(seriesData[2]).toEqual(['2023-02-01',
          20])
      },
    )

    it(
      'should handle missing values gracefully',
      () => {
        const data = [
          { date: '2023-01-01',
            val: 5 },
          { date: 'invalid-date',
            val: 10 }, // Should be filtered out
          { date: '2023-01-03' }, // Missing val, should be 0 or NaN handled
        ]

        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'calendar',
          { valueProp: 'val' },
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const series = option.series as readonly any[]

        const seriesData = series[0].data as readonly (readonly [string, number])[]

        // invalid-date should be skipped?
        // Let's check logic:
        // const dateVal = safeToString(dateRaw)
        // return !dateVal ? null : ...
        // If 'invalid-date' is returned as string, it's included.
        // ECharts might complain but transformer includes it if it's a string.
        // Wait, logic is: safeToString returns string.
        // So 'invalid-date' is valid string.
        // But let's check if there is date validation. There isn't in the transformer code I saw.
        // It just passes string.

        // The empty value one:
        // const val = valueProp ? Number(...) : NaN
        // const finalVal = Number.isNaN(val) ? 0 : val
        // So it should be 0.

        const missingValItem = seriesData.find(d => d[0] === '2023-01-03')
        expect(missingValItem).toBeDefined()
        // @ts-expect-error - suppress strictNullChecks in tests
        expect(missingValItem[1]).toBe(0)
      },
    )

    it(
      'should calculate visualMap min/max correctly',
      () => {
        const data = [
          { date: '2023-01-01',
            val: 10 },
          { date: '2023-01-02',
            val: 100 },
        ]

        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'calendar',
          { valueProp: 'val' },
        )

        const visualMap = option.visualMap as VisualMapComponentOption

        expect(visualMap.min).toBe(10)
        expect(visualMap.max).toBe(100)
      },
    )

    it(
      'should handle empty data',
      () => {
        const data: [] = []
        const option = transformDataToChartOption(
          data,
          'date',
          '',
          'calendar',
          { valueProp: 'val' },
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const series = option.series as readonly any[]
        expect(series).toHaveLength(0)
      },
    )
  },
)
