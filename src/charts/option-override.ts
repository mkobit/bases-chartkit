import type { EChartsOption } from 'echarts'
import * as R from 'remeda'
import { isRecord } from './transformers/bases-values'

function parseJsonOverride(rawOverride: unknown): unknown {
  try {
    return typeof rawOverride === 'string' ? JSON.parse(rawOverride) : rawOverride
  }
  catch {
    return null
  }
}

/**
 * Deep-merges an optional JSON or object override into a generated EChartsOption.
 *
 * If the raw override is not provided or cannot be parsed as a record object,
 * the original option is returned unmodified. If option is null, returns null.
 */
export function applyOptionOverride(
  option: EChartsOption | null,
  rawOverride: unknown,
): EChartsOption | null {
  const parsed = parseJsonOverride(rawOverride)
  const parsedOverride = isRecord(parsed) && !Array.isArray(parsed) ? parsed : null

  return !option
    ? null
    : !parsedOverride
        ? option
        : R.mergeDeep(option, parsedOverride)
}
