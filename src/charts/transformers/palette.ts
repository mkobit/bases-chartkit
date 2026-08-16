import { isRecord } from './utils'

/**
 * A vibrant 10-color categorical palette optimized for light and dark themes.
 * Provides default distinct colors when ECharts theme palette is not directly accessible
 * (e.g. wordcloud extension or fallback mapping).
 */
export const DEFAULT_CATEGORICAL_PALETTE: readonly string[] = [
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
] as const

/**
 * Deterministic color picker for strings or keys (e.g. word cloud items, node names).
 */
export function getCategoricalColor(key: string | number): string {
  const str = String(key)
  const hash = str.split('').reduce(
    (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
    0,
  )
  const idx = Math.abs(hash) % DEFAULT_CATEGORICAL_PALETTE.length
  return DEFAULT_CATEGORICAL_PALETTE[idx] ?? DEFAULT_CATEGORICAL_PALETTE[0] ?? '#5470c6'
}

/**
 * Helper to safely extract a node name or string key from callback params.
 */
export function getParamKey(params: unknown): string {
  if (isRecord(params) && typeof params.name === 'string' && params.name.length > 0) {
    return params.name
  }
  if (isRecord(params) && typeof params.dataIndex === 'number') {
    return String(params.dataIndex)
  }
  return ''
}

/**
 * Default heatmap gradient when no visualMapColor override is provided.
 *
 * Heatmap value is a magnitude, so this is a *sequential* single-hue blue ramp
 * (light = low, dark = high) with monotonic lightness -- not the old blue->
 * yellow->red spectral rainbow, which encoded magnitude as hue and made both
 * the low (dark blue) and high (dark red) ends read as equally "intense" while
 * the mid values washed out to pale yellow. A sequential ramp lets color alone
 * communicate more/less. Steps are the dataviz reference sequential-blue ramp
 * (100->700). A future theme layer can override this per-theme via the existing
 * visualMapColor option; heatmap.ts already falls back here only when unset.
 */
export const DEFAULT_HEATMAP_COLOR_GRADIENT: readonly string[] = [
  '#cde2fb',
  '#9ec5f4',
  '#6da7ec',
  '#3987e5',
  '#256abf',
  '#184f95',
  '#0d366b',
] as const

/**
 * Centralized theme design tokens for light and dark mode chrome, range bands, and borders.
 */
export const THEME_TOKENS = {
  bulletRanges: {
    dark: { low: '#404040', mid: '#595959', high: '#737373' },
    light: { low: '#e0e0e0', mid: '#bdbdbd', high: '#9e9e9e' },
  },
  targetMarker: {
    dark: '#fff',
    light: '#000',
  },
  transparent: 'transparent',
} as const
