import type { GridComponentOption } from 'echarts'
import type { BaseTransformerOptions } from './base'
import { resolveLegendPosition } from './legend'

export interface CartesianGridOptions {
  readonly hasDataZoomSlider?: boolean
}

const DEFAULT_GRID_MARGIN = 16
const COMPACT_SLIDER_BOTTOM_MARGIN = 44
const BOTTOM_LEGEND_MARGIN = 36
const COMPACT_SLIDER_WITH_BOTTOM_LEGEND_MARGIN = 64
const VERTICAL_LEGEND_SIDE_MARGIN = '15%'

/**
 * Builds a shared cartesian `grid` configuration using ECharts 6's
 * `outerBoundsMode: 'same'` and `outerBoundsContain: 'all'` so both axis
 * labels and axis names stay inside the plot bounds without clipping.
 * `top` is left unset so `applyTopLegendGridOffset` can adjust for subtitles.
 */
export function getCartesianGridOption(
  options?: BaseTransformerOptions,
  gridOptions?: CartesianGridOptions,
): Readonly<GridComponentOption> {
  const hasLegend = options?.legend ?? false
  const legendPos = hasLegend ? resolveLegendPosition(options) : undefined
  const hasSlider = gridOptions?.hasDataZoomSlider ?? false

  const bottom =
    hasSlider && legendPos === 'bottom'
      ? COMPACT_SLIDER_WITH_BOTTOM_LEGEND_MARGIN
      : hasSlider
        ? COMPACT_SLIDER_BOTTOM_MARGIN
        : legendPos === 'bottom'
          ? BOTTOM_LEGEND_MARGIN
          : DEFAULT_GRID_MARGIN

  return {
    left: legendPos === 'left' ? VERTICAL_LEGEND_SIDE_MARGIN : DEFAULT_GRID_MARGIN,
    right: legendPos === 'right' ? VERTICAL_LEGEND_SIDE_MARGIN : DEFAULT_GRID_MARGIN,
    bottom,
    outerBoundsMode: 'same',
    outerBoundsContain: 'all',
  }
}
