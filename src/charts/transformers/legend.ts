import type { LegendComponentOption } from 'echarts'
import type { BaseTransformerOptions } from './base'

export const TOP_LEGEND_WITH_SUBTITLE_OFFSET = 56
export const GRID_TOP_WITH_SUBTITLE_AND_TOP_LEGEND = 88
// `left: 'center'` splits `right` evenly across both sides when ECharts clamps
// scrollable legend width, so 160 reserves ~80px on the right for the
// copy/fullscreen toolbar (two icon buttons + 8px offset in `styles.css`).
export const TOP_LEGEND_TOOLBAR_RIGHT_MARGIN = 160

export function resolveLegendPosition(
  options?: BaseTransformerOptions,
): 'top' | 'bottom' | 'left' | 'right' {
  const isCompact =
    (options?.isMobile ?? false) ||
    (options?.containerWidth !== undefined && options.containerWidth < 600)
  const defaultPosition = isCompact ? 'bottom' : 'top'
  const position = options?.legendPosition || defaultPosition
  if (position === 'bottom' || position === 'left' || position === 'right' || position === 'top') {
    return position
  }
  return 'top'
}

export function hasTopLegendWithSubtitle(options?: BaseTransformerOptions): boolean {
  return (
    Boolean(options?.legend) &&
    Boolean(options?.description) &&
    resolveLegendPosition(options) === 'top'
  )
}

export function getLegendOption(
  options?: BaseTransformerOptions,
): Readonly<LegendComponentOption> | undefined {
  const showLegend = options?.legend ?? false
  const position = resolveLegendPosition(options)

  const defaultOrient = position === 'left' || position === 'right' ? 'vertical' : 'horizontal'
  const orient = options?.legendOrient ?? defaultOrient

  // eslint-disable-next-line functional/prefer-immutable-types -- LegendComponentOption is a union type alias (LegendOption | ScrollableLegendOption); Readonly<> wrapping a union loses the alias identity the ignoreTypePattern name match relies on (bd memory: prefer-immutable-types-union-option-alias-gap).
  const base: Readonly<LegendComponentOption> = {
    orient,
    type: 'scroll',
  }

  const topOffset = hasTopLegendWithSubtitle(options) ? TOP_LEGEND_WITH_SUBTITLE_OFFSET : 0

  const positionMap: Readonly<
    Record<'top' | 'bottom' | 'left' | 'right', Readonly<LegendComponentOption>>
  > = {
    bottom: { bottom: 0, left: 'center' },
    left: { left: 0, top: 'middle' },
    right: { right: 0, top: 'middle' },
    top: { top: topOffset, left: 'center', right: TOP_LEGEND_TOOLBAR_RIGHT_MARGIN },
  }

  return showLegend ? { ...base, ...positionMap[position] } : undefined
}
