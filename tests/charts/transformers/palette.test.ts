import { describe, expect, it } from 'bun:test'
import {
  DEFAULT_CATEGORICAL_PALETTE,
  DEFAULT_SEQUENTIAL_COLOR_GRADIENT,
  getCategoricalColor,
  getParamKey,
  THEME_TOKENS,
} from '../../../src/charts/transformers/palette'

describe('palette module', () => {
  it('provides non-empty default categorical palette and heatmap gradient', () => {
    expect(DEFAULT_CATEGORICAL_PALETTE.length).toBeGreaterThanOrEqual(10)
    expect(DEFAULT_SEQUENTIAL_COLOR_GRADIENT.length).toBeGreaterThanOrEqual(5)
  })

  it('deterministically selects color from categorical palette', () => {
    const color1 = getCategoricalColor('foo')
    const color2 = getCategoricalColor('foo')
    const color3 = getCategoricalColor('bar')

    expect(color1).toBe(color2)
    expect(DEFAULT_CATEGORICAL_PALETTE).toContain(color1)
    expect(DEFAULT_CATEGORICAL_PALETTE).toContain(color3)
  })

  it('extracts param key correctly', () => {
    expect(getParamKey({ name: 'Alpha' })).toBe('Alpha')
    expect(getParamKey({ dataIndex: 3 })).toBe('3')
    expect(getParamKey(null)).toBe('')
  })

  it('provides light and dark mode theme tokens', () => {
    expect(THEME_TOKENS.bulletRanges.dark.low).toBe('#404040')
    expect(THEME_TOKENS.bulletRanges.light.low).toBe('#e0e0e0')
    expect(THEME_TOKENS.targetMarker.dark).toBe('#fff')
    expect(THEME_TOKENS.targetMarker.light).toBe('#000')
    expect(THEME_TOKENS.transparent).toBe('transparent')
  })
})
