import { Temporal } from 'temporal-polyfill'
import type { FrontmatterValue } from './schema'

export const serializeFrontmatter = (fm: Readonly<Record<string, FrontmatterValue>>): string => {
  const entries = Object.entries(fm)
  if (entries.length === 0) {
    return '---\n---\n'
  }

  const lines = entries.flatMap(([key, value]) => {
    if (typeof value === 'string') {
      const escapedValue = value.replace(/"/g, '\\"')
      return [`${key}: "${escapedValue}"`]
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return [`${key}: ${value}`]
    }
    if (Array.isArray(value)) {
      return [`${key}:`, ...value.map(item => `  - ${item}`)]
    }
    // Explicitly check for Temporal types using instanceof
    if (
      value instanceof Temporal.PlainDate
      || value instanceof Temporal.Instant
      || value instanceof Temporal.PlainDateTime
      || value instanceof Temporal.ZonedDateTime
    ) {
      return [`${key}: ${value.toString()}`]
    }
    return []
  })

  return ['---', ...lines, '---'].join('\n') + '\n'
}
