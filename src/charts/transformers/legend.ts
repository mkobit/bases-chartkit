import type { LegendComponentOption } from 'echarts'
import type { BaseTransformerOptions } from './base'

export function getLegendOption(options?: BaseTransformerOptions): Readonly<LegendComponentOption> | undefined {
  const showLegend = options?.legend ?? false

  const isCompact = (options?.isMobile ?? false) || (options?.containerWidth !== undefined && options.containerWidth < 600)
  const defaultPosition = isCompact ? 'bottom' : 'top'
  const position = options?.legendPosition || defaultPosition

  const defaultOrient = (position === 'left' || position === 'right') ? 'vertical' : 'horizontal'
  const orient = options?.legendOrient ?? defaultOrient

  // eslint-disable-next-line functional/prefer-immutable-types -- LegendComponentOption is a union type alias (LegendOption | ScrollableLegendOption); Readonly<> wrapping a union loses the alias identity the ignoreTypePattern name match relies on (bd memory: prefer-immutable-types-union-option-alias-gap).
  const base: Readonly<LegendComponentOption> = {
    orient,
    type: 'scroll',
  }

  const positionMap: Readonly<Record<string, Readonly<LegendComponentOption>>> = {
    bottom: { bottom: 0,
      left: 'center' },
    left: { left: 0,
      top: 'middle' },
    right: { right: 0,
      top: 'middle' },
    top: { top: 0,
      left: 'center' },
  }

  const posConfig = positionMap[position] ?? positionMap['top']

  return showLegend

    ? { ...base,
        ...posConfig }
    : undefined
}
