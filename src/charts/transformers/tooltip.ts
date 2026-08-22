import type { EChartsOption } from 'echarts'

export type TooltipFormatterFn = NonNullable<EChartsOption['tooltip']> extends { formatter?: infer F } ? F : never

// ECharts' `tooltip.formatter` option type is a broad union covering every
// trigger/chart shape it supports. Chart-specific tooltip formatters written
// against a transformer's own narrower params type (single object for
// trigger:'item', array for trigger:'axis') need to bridge to that broader
// type at the assignment site -- centralizing the bridge here means the cast
// (and its lint exemption) exists in one place instead of once per chart.
export function asTooltipFormatter<P>(fn: (params: P) => string): TooltipFormatterFn {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-restricted-syntax -- see comment above; ECharts' own formatter type can't be narrowed from a generic chart-specific function type without a bridging cast.
  return fn as unknown as TooltipFormatterFn
}
