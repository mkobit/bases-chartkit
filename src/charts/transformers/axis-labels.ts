// Beyond this many categories, forcing every x-axis label to render
// (axisLabel.interval: 0) reliably overlaps into illegible, garbled text --
// switch to ECharts' own overlap-avoiding auto-thinning instead, the same
// way compact/mobile layouts already do.
export const MANY_CATEGORIES_THRESHOLD = 15

const DEFAULT_CONTAINER_WIDTH = 1000
const ESTIMATED_SIDE_CHROME_PX = 140
const MIN_ESTIMATED_PLOT_WIDTH_PX = 120
const ESTIMATED_CHAR_WIDTH_PX = 7.2
const LABEL_PADDING_PX = 12

export interface AxisLabelOverlapContext {
  readonly labels?: readonly string[]
  readonly containerWidth?: number
}

export interface AxisLabelOverlapOptions {
  readonly interval: 0 | 'auto'
  readonly rotate: number
  readonly hideOverlap: true
}

function estimateHorizontalLabelOverlap(
  categoryCount: number,
  labels: readonly string[] | undefined,
  containerWidth: number | undefined,
): boolean {
  if (!labels || labels.length === 0 || categoryCount <= 1) {
    return false
  }
  const effectiveWidth = containerWidth !== undefined && containerWidth > 0
    ? containerWidth
    : DEFAULT_CONTAINER_WIDTH
  const plotWidth = Math.max(effectiveWidth - ESTIMATED_SIDE_CHROME_PX, MIN_ESTIMATED_PLOT_WIDTH_PX)
  const slotWidth = plotWidth / categoryCount
  const maxLabelLength = Math.max(...labels.map(label => label.length))
  return maxLabelLength * ESTIMATED_CHAR_WIDTH_PX + LABEL_PADDING_PX > slotWidth
}

// For a cartesian axis that renders one label per category: avoid overlap on
// many-point or wide-label series without regressing the "show every label"
// behavior for short ones.
export function getAxisLabelOverlapOptions(
  categoryCount: number,
  isCompact: boolean,
  explicitRotate: number | undefined,
  flipAxis: boolean,
  context?: AxisLabelOverlapContext,
): AxisLabelOverlapOptions {
  const needsThinning = isCompact || categoryCount > MANY_CATEGORIES_THRESHOLD
  const labelsOverlap = !flipAxis && estimateHorizontalLabelOverlap(
    categoryCount,
    context?.labels,
    context?.containerWidth,
  )
  const rotate = explicitRotate ?? ((needsThinning || labelsOverlap) && !flipAxis ? 45 : 0)
  const interval: 0 | 'auto' = needsThinning || (labelsOverlap && !flipAxis && rotate === 0)
    ? 'auto'
    : 0
  return {
    interval,
    rotate,
    hideOverlap: true,
  }
}
