import type { BaseTransformerOptions } from './base'
import { resolveLegendPosition } from './legend'

export interface CircularLayout {
  readonly center: [string, string]
  readonly radius: string
}

export interface CircularLayoutOptions {
  readonly defaultRadius?: string
  readonly sideLegendRadius?: string
  readonly hasTopVisualMap?: boolean
  readonly hasBottomVisualMap?: boolean
}

/**
 * Computes center and radius offsets for circular/polar/radar charts so outer
 * labels do not collide with titles, subtitles, legends, or visual maps.
 */
export function resolveCircularLayout(
  options?: BaseTransformerOptions,
  layoutOptions?: CircularLayoutOptions,
): CircularLayout {
  const defaultRadius = layoutOptions?.defaultRadius ?? '75%'
  const sideLegendRadius = layoutOptions?.sideLegendRadius ?? '62%'
  const hasTitle = Boolean(options?.title)
  const hasSubtitle = Boolean(options?.description)
  const hasTopTitle = hasTitle || hasSubtitle
  const hasLegend = Boolean(options?.legend)
  const legendPosition = resolveLegendPosition(options)

  const hasTopLegend = hasLegend && legendPosition === 'top'
  const hasBottomLegend = hasLegend && legendPosition === 'bottom'
  const hasLeftLegend = hasLegend && legendPosition === 'left'
  const hasRightLegend = hasLegend && legendPosition === 'right'

  const hasTopChrome = hasTopTitle || hasTopLegend || Boolean(layoutOptions?.hasTopVisualMap)
  const hasBottomChrome = hasBottomLegend || Boolean(layoutOptions?.hasBottomVisualMap)

  const cx = hasRightLegend ? '42%' : hasLeftLegend ? '58%' : '50%'

  if (!hasTopChrome && !hasBottomChrome) {
    return {
      center: [cx, '50%'],
      radius: hasLeftLegend || hasRightLegend ? sideLegendRadius : defaultRadius,
    }
  }

  if (hasTopChrome && hasBottomChrome) {
    const cy = hasTopTitle && hasTopLegend ? '55%' : hasTopTitle ? '54%' : '50%'
    const radius = hasTopTitle && hasTopLegend ? '54%' : hasTopTitle ? '58%' : '60%'
    return {
      center: [cx, cy],
      radius,
    }
  }

  if (hasTopChrome) {
    const cy = hasTopTitle && hasTopLegend ? '58%' : hasSubtitle ? '56%' : '54%'
    const radius = hasTopTitle && hasTopLegend ? '60%' : '66%'
    return {
      center: [cx, cy],
      radius,
    }
  }

  return {
    center: [cx, '46%'],
    radius: '66%',
  }
}
