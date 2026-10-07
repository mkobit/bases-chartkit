/**
 * Shared design tokens for chart colors and style metrics.
 */

export const COLOR_TOKENS = {
  palettes: {
    categorical: [
      '#5470c6', // Blue
      '#91cc75', // Green
      '#fac858', // Yellow
      '#ee6666', // Red
      '#73c0de', // Cyan
      '#3ba272', // Dark Green
      '#fc8452', // Orange
      '#9a60b4', // Purple
      '#ea7ccc', // Pink
      '#48b5b7', // Teal
    ],
    sequential: [
      '#cde2fb',
      '#9ec5f4',
      '#6da7ec',
      '#3987e5',
      '#256abf',
      '#184f95',
      '#0d366b',
    ],
  },
  status: {
    up: '#14b143',
    down: '#ef232a',
  },
  chrome: {
    bulletRanges: {
      dark: { low: '#404040', mid: '#595959', high: '#737373' },
      light: { low: '#e0e0e0', mid: '#bdbdbd', high: '#9e9e9e' },
    },
    targetMarker: {
      dark: '#fff',
      light: '#000',
    },
    connectors: {
      dark: 'rgba(255, 255, 255, 0.35)',
      light: 'rgba(0, 0, 0, 0.25)',
    },
    totalBar: {
      dark: '#7aa0c4',
      light: '#5470c6',
    },
    labelInk: '#1a1a19',
    labelHalo: 'rgba(255, 255, 255, 0.85)',
    shadows: {
      subtle: 'rgba(0, 0, 0, 0.2)',
      standard: 'rgba(0, 0, 0, 0.5)',
      deep: 'rgba(0, 0, 0, 0.8)',
      darkMuted: '#333',
    },
    transparent: 'transparent',
  },
} as const

export const STYLE_TOKENS = {
  barWidth: {
    bulletRange: '80%',
    bulletValue: '40%',
    bulletSoloValue: '60%',
  },
  gap: {
    histogramCategory: 0,
    treemapLevels: [5, 3, 1] as const,
  },
  treemapSaturations: [
    [0.3, 0.5],
    [0.35, 0.6],
  ] as const,
  strokeWidth: {
    hairline: 0.5,
    thin: 1,
    medium: 2,
  },
  shadowBlur: {
    standard: 10,
    deep: 20,
  },
} as const

export type ColorTokens = typeof COLOR_TOKENS
export type StyleTokens = typeof STYLE_TOKENS
