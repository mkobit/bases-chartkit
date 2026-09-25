import { describe, it, expect } from 'bun:test'
import { applyOptionOverride } from '../../src/charts/option-override'
import type { EChartsOption } from 'echarts'

describe(
  'applyOptionOverride',
  () => {
    const baseOption: EChartsOption = {
      title: {
        text: 'Original Title',
      },
      grid: {
        left: 20,
        right: 20,
      },
      series: [
        {
          type: 'bar',
          data: [1, 2, 3],
        },
      ],
    }

    it(
      'should return null if option is null',
      () => {
        expect(applyOptionOverride(null, '{"title":{"text":"Override"}}')).toBeNull()
        expect(applyOptionOverride(null, undefined)).toBeNull()
      },
    )

    it(
      'should return option unmodified if override is empty, null, or undefined',
      () => {
        expect(applyOptionOverride(baseOption, undefined)).toEqual(baseOption)
        expect(applyOptionOverride(baseOption, null)).toEqual(baseOption)
        expect(applyOptionOverride(baseOption, '')).toEqual(baseOption)
      },
    )

    it(
      'should merge valid JSON string override deeply into option',
      () => {
        const override = JSON.stringify({
          title: {
            text: 'Overridden Title',
          },
          grid: {
            top: 50,
          },
        })

        const result = applyOptionOverride(baseOption, override)
        expect(result).toEqual({
          title: {
            text: 'Overridden Title',
          },
          grid: {
            left: 20,
            right: 20,
            top: 50,
          },
          series: [
            {
              type: 'bar',
              data: [1, 2, 3],
            },
          ],
        })
      },
    )

    it(
      'should merge direct record object override deeply into option',
      () => {
        const override = {
          tooltip: {
            show: true,
          },
        }

        const result = applyOptionOverride(baseOption, override)
        expect(result).toEqual({
          ...baseOption,
          tooltip: {
            show: true,
          },
        })
      },
    )

    it(
      'should return option unmodified for non-object JSON values',
      () => {
        expect(applyOptionOverride(baseOption, '123')).toEqual(baseOption)
        expect(applyOptionOverride(baseOption, '"just a string"')).toEqual(baseOption)
        expect(applyOptionOverride(baseOption, 'true')).toEqual(baseOption)
        expect(applyOptionOverride(baseOption, '[1, 2, 3]')).toEqual(baseOption)
      },
    )

    it(
      'should return option unmodified for non-record objects like arrays',
      () => {
        expect(applyOptionOverride(baseOption, [1, 2, 3])).toEqual(baseOption)
      },
    )

    it(
      'should return option unmodified on malformed JSON without throwing',
      () => {
        expect(applyOptionOverride(baseOption, '{ invalid json')).toEqual(baseOption)
        expect(applyOptionOverride(baseOption, '{"title":')).toEqual(baseOption)
      },
    )
  },
)
