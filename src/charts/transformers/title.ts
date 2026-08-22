import type { TitleComponentOption } from 'echarts'
import type { BaseTransformerOptions } from './base'

export function getTitleOption(options?: BaseTransformerOptions): Readonly<TitleComponentOption> | undefined {
  const text = options?.title
  const subtext = options?.description

  if (!text && !subtext) {
    return undefined
  }

  const title: Readonly<TitleComponentOption> = {
    ...(text ? { text } : {}),
    ...(subtext ? { subtext } : {}),
    left: 'left',
    top: 0,
  }

  return title
}
