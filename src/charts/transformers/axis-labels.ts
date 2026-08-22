// Beyond this many categories, forcing every x-axis label to render
// (axisLabel.interval: 0) reliably overlaps into illegible, garbled text --
// switch to ECharts' own overlap-avoiding auto-thinning instead, the same
// way compact/mobile layouts already do.
export const MANY_CATEGORIES_THRESHOLD = 15

export interface AxisLabelOverlapOptions {
  readonly interval: 0 | 'auto'
  readonly rotate: number
}

// For a cartesian axis that renders one label per category: avoid overlap on
// many-point series without regressing the "show every label" behavior for
// short ones.
export function getAxisLabelOverlapOptions(
  categoryCount: number,
  isCompact: boolean,
  explicitRotate: number | undefined,
  flipAxis: boolean,
): AxisLabelOverlapOptions {
  const needsThinning = isCompact || categoryCount > MANY_CATEGORIES_THRESHOLD
  return {
    interval: needsThinning ? 'auto' : 0,
    rotate: explicitRotate ?? (needsThinning && !flipAxis ? 45 : 0),
  }
}
