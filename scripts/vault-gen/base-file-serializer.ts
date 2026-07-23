import * as R from 'remeda'
import type { ChartVariantSpec } from './spec'

// Every prop-key style this repo's .base files actually use: single
// `note.X` values (xAxisProp, yAxisProp, seriesProp, targetProp, ...) and
// comma-separated multi-prop lists (metricProps, xProp). Both need their
// `note.X` fragments pulled out to build the shared `properties:` block.
function extractPropertyIds(value: string): readonly string[] {
  return R.pipe(
    value.split(','),
    R.map(part => part.trim()),
    R.filter(part => part.startsWith('note.')),
  )
}

function extractFilterPropertyIds(filter: string): readonly string[] {
  const matches = filter.match(/note\.[A-Za-z0-9_]+/g)
  return matches ?? []
}

function collectPropertyIds(variant: ChartVariantSpec): readonly string[] {
  return R.pipe(
    [
      ...Object.values(variant.propBindings).flatMap(extractPropertyIds),
      ...(variant.filters ?? []).flatMap(extractFilterPropertyIds),
    ],
    R.unique(),
    R.sort((a, b) => a.localeCompare(b)),
  )
}

function displayNameFor(propertyId: string): string {
  const bareName = propertyId.replace(/^note\./, '')
  // Insert a space before each capital that follows a lowercase letter, so
  // e.g. 'LifeExpectancy' -> 'Life Expectancy' -- matches how existing
  // hand-written .base files title-case their displayName values.
  return bareName.replace(/([a-z])([A-Z])/g, '$1 $2')
}

function serializePropertiesBlock(propertyIds: readonly string[]): readonly string[] {
  if (propertyIds.length === 0) {
    return []
  }
  return [
    'properties:',
    ...propertyIds.flatMap(id => [
      `  ${id}:`,
      `    displayName: ${displayNameFor(id)}`,
    ]),
  ]
}

function serializeValue(value: string | number | boolean): string {
  return typeof value === 'string' ? `"${value}"` : String(value)
}

function serializeViewBlock(chartType: string, variant: ChartVariantSpec): readonly string[] {
  const literalLines = Object.entries(variant.literalOptions ?? {})
    .map(([key, value]) => `    ${key}: ${serializeValue(value)}`)
  const bindingLines = Object.entries(variant.propBindings)
    .map(([key, value]) => `    ${key}: ${value}`)

  // Every variant scopes to its own chart-type directory's notes by
  // default -- without this, a view with no other filter matches every
  // note in the whole vault (confirmed empirically: an unscoped bar/
  // view showed "156 results" against the full vault instead of its own
  // 9 notes), which gets worse as more chart-type directories are added.
  const folderFilter = `file.folder == "${chartType}/notes"`
  const allFilters = [folderFilter, ...(variant.filters ?? [])]
  const filterLines = [
    '    filters:',
    '      and:',
    ...allFilters.map(f => `        - ${f}`),
  ]

  return [
    'views:',
    `  - type: ${variant.viewType}`,
    `    name: ${variant.viewName}`,
    ...bindingLines,
    ...literalLines,
    ...filterLines,
  ]
}

export function buildBaseFileYaml(chartType: string, variant: ChartVariantSpec): string {
  const propertyIds = collectPropertyIds(variant)
  const lines = [
    ...serializePropertiesBlock(propertyIds),
    ...serializeViewBlock(chartType, variant),
  ]
  return `${lines.join('\n')}\n`
}
