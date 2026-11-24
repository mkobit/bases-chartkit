import { formatValue } from './formatters'

const compactNumberFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})

// Abbreviates large numeric visualMap min/max handle labels (e.g. GDP
// figures like 6994402 -> "7M") so they stay short enough not to overlap
// each other or the axis labels below. ECharts calls this with a single raw
// handle value (see VisualMapModel#formatValueText), typed OptionDataValue
// rather than plain number, hence the runtime narrow instead of a `number`
// parameter.
export function formatCompactVisualMapLabel(value: unknown): string {
  return typeof value === 'number' ? compactNumberFormatter.format(value) : String(value)
}

/**
 * Formats a piecewise visualMap item label using `valueFormat` when provided,
 * falling back to compact numeric formatting. ECharts passes `(value, value2)`
 * for interval pieces and `(value)` for single-value or category pieces.
 */
export function formatPiecewiseVisualMapLabel(
  value: unknown,
  value2?: unknown,
  valueFormat?: string,
): string {
  const formatBound = (bound: unknown): string =>
    valueFormat !== undefined && valueFormat.trim() !== ''
      ? formatValue(bound, valueFormat)
      : formatCompactVisualMapLabel(bound)

  if (value2 === undefined) {
    return formatBound(value)
  }
  if (value === -Infinity) {
    return `< ${formatBound(value2)}`
  }
  if (value2 === Infinity) {
    return `> ${formatBound(value)}`
  }
  return `${formatBound(value)} - ${formatBound(value2)}`
}
