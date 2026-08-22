const compactNumberFormatter = new Intl.NumberFormat(
  undefined,
  { notation: 'compact',
    maximumFractionDigits: 1 },
)

// Abbreviates large numeric visualMap min/max handle labels (e.g. GDP
// figures like 6994402 -> "7M") so they stay short enough not to overlap
// each other or the axis labels below. ECharts calls this with a single raw
// handle value (see VisualMapModel#formatValueText), typed OptionDataValue
// rather than plain number, hence the runtime narrow instead of a `number`
// parameter.
export function formatCompactVisualMapLabel(value: unknown): string {
  return typeof value === 'number' ? compactNumberFormatter.format(value) : String(value)
}
