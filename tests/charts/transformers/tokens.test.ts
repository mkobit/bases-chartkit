import { describe, expect, it } from 'bun:test'
import { COLOR_TOKENS, STYLE_TOKENS } from '../../../src/charts/transformers/tokens'

describe('design tokens', () => {
  describe('COLOR_TOKENS', () => {
    it('provides palettes with expected length and values', () => {
      expect(COLOR_TOKENS.palettes.categorical).toHaveLength(10)
      expect(COLOR_TOKENS.palettes.categorical[0]).toBe('#5470c6')
      expect(COLOR_TOKENS.palettes.sequential).toHaveLength(7)
      expect(COLOR_TOKENS.palettes.sequential[0]).toBe('#cde2fb')
    })

    it('provides status colors for directional movements', () => {
      expect(COLOR_TOKENS.status.up).toBe('#14b143')
      expect(COLOR_TOKENS.status.down).toBe('#ef232a')
    })

    it('provides chrome tokens for bullet charts, connectors, labels, and shadows', () => {
      expect(COLOR_TOKENS.chrome.bulletRanges.dark.low).toBe('#404040')
      expect(COLOR_TOKENS.chrome.bulletRanges.light.low).toBe('#e0e0e0')
      expect(COLOR_TOKENS.chrome.targetMarker.dark).toBe('#fff')
      expect(COLOR_TOKENS.chrome.targetMarker.light).toBe('#000')
      expect(COLOR_TOKENS.chrome.connectors.dark).toBe('rgba(255, 255, 255, 0.35)')
      expect(COLOR_TOKENS.chrome.connectors.light).toBe('rgba(0, 0, 0, 0.25)')
      expect(COLOR_TOKENS.chrome.totalBar.dark).toBe('#7aa0c4')
      expect(COLOR_TOKENS.chrome.totalBar.light).toBe('#5470c6')
      expect(COLOR_TOKENS.chrome.labelInk).toBe('#1a1a19')
      expect(COLOR_TOKENS.chrome.labelHalo).toBe('rgba(255, 255, 255, 0.85)')
      expect(COLOR_TOKENS.chrome.shadows.subtle).toBe('rgba(0, 0, 0, 0.2)')
      expect(COLOR_TOKENS.chrome.shadows.standard).toBe('rgba(0, 0, 0, 0.5)')
      expect(COLOR_TOKENS.chrome.shadows.deep).toBe('rgba(0, 0, 0, 0.8)')
      expect(COLOR_TOKENS.chrome.shadows.darkMuted).toBe('#333')
      expect(COLOR_TOKENS.chrome.transparent).toBe('transparent')
    })
  })

  describe('STYLE_TOKENS', () => {
    it('provides barWidth metrics', () => {
      expect(STYLE_TOKENS.barWidth.bulletRange).toBe('80%')
      expect(STYLE_TOKENS.barWidth.bulletValue).toBe('40%')
      expect(STYLE_TOKENS.barWidth.bulletSoloValue).toBe('60%')
    })

    it('provides gap metrics', () => {
      expect(STYLE_TOKENS.gap.histogramCategory).toBe(0)
      expect(STYLE_TOKENS.gap.treemapLevels).toEqual([5, 3, 1])
    })

    it('provides treemap saturation levels', () => {
      expect(STYLE_TOKENS.treemapSaturations).toHaveLength(2)
      expect(STYLE_TOKENS.treemapSaturations[0]).toEqual([0.3, 0.5])
      expect(STYLE_TOKENS.treemapSaturations[1]).toEqual([0.35, 0.6])
    })

    it('provides stroke widths', () => {
      expect(STYLE_TOKENS.strokeWidth.hairline).toBe(0.5)
      expect(STYLE_TOKENS.strokeWidth.thin).toBe(1)
      expect(STYLE_TOKENS.strokeWidth.medium).toBe(2)
    })

    it('provides shadow blur metrics', () => {
      expect(STYLE_TOKENS.shadowBlur.standard).toBe(10)
      expect(STYLE_TOKENS.shadowBlur.deep).toBe(20)
    })
  })
})
