import { describe, expect, it } from 'bun:test'
import {
  extractObsidianCssTokens,
  buildEChartsThemeFromObsidian,
  resolveTheme,
  OBSIDIAN_AUTO_THEME_NAME,
} from '../../src/charts/obsidian-theme'
import type { StyleResolverTarget } from '../../src/charts/obsidian-theme'
import { DEFAULT_CATEGORICAL_PALETTE } from '../../src/charts/transformers/palette'

function createMockTarget(cssVars: Record<string, string>, isDark = false): StyleResolverTarget {
  return {
    ownerDocument: {
      body: {
        classList: {
          contains: (token: string) => token === 'theme-dark' && isDark,
        },
      },
      defaultView: {
        getComputedStyle: () => ({
          getPropertyValue: (prop: string) => cssVars[prop] ?? '',
        }),
      },
    },
  }
}

describe('obsidian-theme', () => {
  describe('extractObsidianCssTokens', () => {
    it('should return null when no core Obsidian CSS custom properties are defined', () => {
      const mockTarget = createMockTarget({})
      const tokens = extractObsidianCssTokens(mockTarget)
      expect(tokens).toBeNull()
    })

    it('should extract core colors, borders, and dark mode state when properties are defined', () => {
      const cssVars: Record<string, string> = {
        '--text-normal': '#ffffff',
        '--text-muted': '#a0a0a0',
        '--text-faint': '#606060',
        '--text-accent': '#aa88ff',
        '--interactive-accent': '#7b68ee',
        '--background-primary': '#1e1e1e',
        '--background-secondary': '#252526',
        '--background-modifier-border': '#333333',
        '--font-interface': 'Inter, sans-serif',
        '--color-blue': '#409eff',
        '--color-green': '#67c23a',
        '--color-yellow': '#e6a23c',
        '--color-red': '#f56c6c',
      }

      const mockTarget = createMockTarget(cssVars, true)
      const tokens = extractObsidianCssTokens(mockTarget)
      expect(tokens).not.toBeNull()
      expect(tokens?.darkMode).toBe(true)
      expect(tokens?.textNormal).toBe('#ffffff')
      expect(tokens?.textMuted).toBe('#a0a0a0')
      expect(tokens?.textFaint).toBe('#606060')
      expect(tokens?.interactiveAccent).toBe('#7b68ee')
      expect(tokens?.backgroundPrimary).toBe('#1e1e1e')
      expect(tokens?.backgroundSecondary).toBe('#252526')
      expect(tokens?.backgroundModifierBorder).toBe('#333333')
      expect(tokens?.fontFamily).toBe('Inter, sans-serif')
      expect(tokens?.palette).toEqual(['#7b68ee', '#409eff', '#67c23a', '#e6a23c', '#f56c6c'])
    })

    it('should fall back to DEFAULT_CATEGORICAL_PALETTE if fewer than 3 custom colors are set', () => {
      const cssVars: Record<string, string> = {
        '--text-normal': '#222222',
        '--interactive-accent': '#7b68ee',
        '--color-blue': '#409eff',
      }

      const mockTarget = createMockTarget(cssVars, false)
      const tokens = extractObsidianCssTokens(mockTarget)
      expect(tokens).not.toBeNull()
      expect(tokens?.palette).toEqual(DEFAULT_CATEGORICAL_PALETTE)
    })
  })

  describe('buildEChartsThemeFromObsidian', () => {
    it('should build a valid ECharts theme object with transparent background and themed components', () => {
      const mockTokens = {
        darkMode: true,
        backgroundPrimary: '#1e1e1e',
        backgroundSecondary: '#252526',
        backgroundModifierBorder: '#333333',
        textNormal: '#ffffff',
        textMuted: '#a0a0a0',
        textFaint: '#606060',
        textAccent: '#aa88ff',
        interactiveAccent: '#7b68ee',
        fontFamily: 'Inter',
        palette: ['#7b68ee', '#409eff', '#67c23a'],
      }

      const theme = buildEChartsThemeFromObsidian(mockTokens)
      expect(theme.darkMode).toBe(true)
      expect(theme.backgroundColor).toBe('transparent')
      expect(theme.color).toEqual(['#7b68ee', '#409eff', '#67c23a'])
      expect(theme.textStyle).toEqual({ color: '#ffffff', fontFamily: 'Inter' })

      expect(theme.categoryAxis.axisLabel.color).toBe('#a0a0a0')
      expect(theme.categoryAxis.axisLine.lineStyle.color).toBe('#333333')
      expect(theme.tooltip.backgroundColor).toBe('#252526')
      expect(theme.tooltip.borderColor).toBe('#333333')
      expect(theme.tooltip.textStyle.color).toBe('#ffffff')
      expect(theme.legend.textStyle.color).toBe('#ffffff')
      expect(theme.legend.inactiveColor).toBe('#606060')
    })
  })

  describe('resolveTheme', () => {
    it('should prioritize chart-level theme option over plugin and auto theme', () => {
      const resolved = resolveTheme('custom-user-theme', 'plugin-theme', true, false)
      expect(resolved).toBe('custom-user-theme')
    })

    it('should prioritize plugin-level selectedTheme when chart-level option is default', () => {
      const resolved = resolveTheme('default', 'plugin-theme', true, false)
      expect(resolved).toBe('plugin-theme')
    })

    it('should prioritize plugin-level selectedTheme when chart-level option is undefined', () => {
      const resolved = resolveTheme(undefined, 'plugin-theme', true, false)
      expect(resolved).toBe('plugin-theme')
    })

    it('should use OBSIDIAN_AUTO_THEME_NAME when default and auto theme is available', () => {
      const resolved = resolveTheme('default', '', true, true)
      expect(resolved).toBe(OBSIDIAN_AUTO_THEME_NAME)
    })

    it('should fall back to dark when default and auto theme is unavailable in dark mode', () => {
      const resolved = resolveTheme('default', '', false, true)
      expect(resolved).toBe('dark')
    })

    it('should fall back to undefined when default and auto theme is unavailable in light mode', () => {
      const resolved = resolveTheme('default', '', false, false)
      expect(resolved).toBeUndefined()
    })
  })
})
