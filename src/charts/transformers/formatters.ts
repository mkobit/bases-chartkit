import { safeToString } from './bases-values'
import { parseDateToEpochMs } from './dates'

const MONTH_NAMES_SHORT: readonly string[] = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * Formats a duration in milliseconds into a human-readable string using Temporal.Duration.
 */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return ''
  }

  const duration = Temporal.Duration.from({ milliseconds: ms })
  const totalHours = Math.floor(duration.total({ unit: 'hours' }))
  const totalDays = Math.floor(totalHours / 24)
  const remHours = totalHours % 24
  const remMinutes = Math.floor(duration.total({ unit: 'minutes' }) % 60)
  const remSeconds = Math.floor(duration.total({ unit: 'seconds' }) % 60)
  const remMs = Math.floor(duration.milliseconds)

  if (totalDays > 0) {
    return remHours > 0 ? `${totalDays}d ${remHours}h` : `${totalDays}d`
  }
  if (totalHours > 0) {
    return remMinutes > 0 ? `${totalHours}h ${remMinutes}m` : `${totalHours}h`
  }
  if (remMinutes > 0) {
    return remSeconds > 0 ? `${remMinutes}m ${remSeconds}s` : `${remMinutes}m`
  }
  if (remSeconds > 0) {
    return `${remSeconds}s`
  }
  return `${remMs}ms`
}

/**
 * Formats a date value (epoch ms, ISO string, etc.) using a pattern string or preset.
 */
export function formatDateValue(val: unknown, pattern: string): string {
  const epochMs = parseDateToEpochMs(val)
  if (epochMs === null) {
    return safeToString(val)
  }

  const instant = Temporal.Instant.fromEpochMilliseconds(epochMs)
  const zdt = instant.toZonedDateTimeISO('UTC')

  const year = zdt.year
  const month = zdt.month
  const day = zdt.day
  const quarter = Math.ceil(month / 3)

  if (pattern === 'quarter' || pattern === 'Q') {
    return `Q${quarter}`
  }
  if (pattern === 'YYYY-[Q]Q' || pattern === 'YYYY-QQ') {
    return `${year}-Q${quarter}`
  }

  const yearStr = String(year)
  const yearShortStr = yearStr.slice(-2)
  const monthStr = String(month).padStart(2, '0')
  const monthShortName = MONTH_NAMES_SHORT[month - 1] ?? String(month)
  const dayStr = String(day).padStart(2, '0')

  const tokenMap: Record<string, string> = {
    YYYY: yearStr,
    YY: yearShortStr,
    MMM: monthShortName,
    MM: monthStr,
    M: String(month),
    DD: dayStr,
    dd: dayStr,
    D: String(day),
    Q: String(quarter),
  }

  return pattern.replace(/YYYY|YY|MMM|MM|M|DD|dd|D|Q/g, token => tokenMap[token] ?? token)
}

/**
 * Formats a numeric value as currency, percent, compact, or with a format template.
 */
export function formatNumericValue(val: number, pattern: string): string {
  if (pattern.startsWith('currency')) {
    const parts = pattern.split(':')
    const currency = parts[1] ?? 'USD'
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(val)
  }
  if (pattern === 'percent' || pattern === '%') {
    const num = val <= 1 && val >= -1 ? val * 100 : val
    return `${num.toFixed(1)}%`
  }
  if (pattern === 'compact') {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(val)
  }
  if (pattern.includes('{value}')) {
    return pattern.replace('{value}', String(val))
  }
  return String(val)
}

/**
 * General purpose value formatter supporting date, duration, number, and template patterns.
 */
export function formatValue(val: unknown, formatPattern?: string): string {
  if (formatPattern === undefined || formatPattern.trim() === '') {
    return safeToString(val)
  }

  const pattern = formatPattern.trim()

  if (pattern === 'duration' || pattern === 'duration:ms') {
    const num = Number(val)
    return Number.isNaN(num) ? safeToString(val) : formatDurationMs(num)
  }

  if (pattern === 'duration:s') {
    const num = Number(val)
    return Number.isNaN(num) ? safeToString(val) : formatDurationMs(num * 1000)
  }

  if (typeof val === 'number') {
    return formatNumericValue(val, pattern)
  }

  const dateParsed = parseDateToEpochMs(val)
  if (dateParsed !== null && (pattern.includes('Y') || pattern.includes('M') || pattern.includes('D') || pattern.includes('d') || pattern.includes('Q'))) {
    return formatDateValue(val, pattern)
  }

  if (pattern.includes('{value}')) {
    return pattern.replace('{value}', safeToString(val))
  }

  return safeToString(val)
}
