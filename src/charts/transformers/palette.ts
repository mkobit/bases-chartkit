import { isRecord } from './bases-values'
import { COLOR_TOKENS, STYLE_TOKENS } from './tokens'

export { COLOR_TOKENS, STYLE_TOKENS }
export type { ColorTokens, StyleTokens } from './tokens'

/**
 * A vibrant 10-color categorical palette optimized for light and dark themes.
 * Provides default distinct colors when ECharts theme palette is not directly accessible
 * (e.g. wordcloud extension or fallback mapping).
 */
export const DEFAULT_CATEGORICAL_PALETTE: readonly string[] = COLOR_TOKENS.palettes.categorical

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
  return DEFAULT_CATEGORICAL_PALETTE[idx] ?? DEFAULT_CATEGORICAL_PALETTE[0] ?? COLOR_TOKENS.palettes.categorical[0]
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
 * Default magnitude gradient when no visualMapColor override is provided.
 *
 * A magnitude value (heatmap load, calendar activity) maps to a *sequential*
 * single-hue blue ramp (light = low, dark = high) with monotonic lightness --
 * not a blue->yellow->red spectral rainbow, which encoded magnitude as hue and
 * made both the low (dark blue) and high (dark red) ends read as equally
 * "intense" while the mid values washed out to pale yellow. A sequential ramp
 * lets color alone communicate more/less. Steps are the dataviz reference
 * sequential-blue ramp (100->700). A future theme layer can override this
 * per-theme via the existing visualMapColor option; the heatmap and calendar
 * transformers fall back here only when unset.
 */
export const DEFAULT_SEQUENTIAL_COLOR_GRADIENT: readonly string[] = COLOR_TOKENS.palettes.sequential

/**
 * Centralized theme design tokens for light and dark mode chrome, range bands, and borders.
 */
export const THEME_TOKENS = {
  bulletRanges: COLOR_TOKENS.chrome.bulletRanges,
  targetMarker: COLOR_TOKENS.chrome.targetMarker,
  transparent: COLOR_TOKENS.chrome.transparent,
} as const
