import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as R from 'remeda'
import { variantRelativePath } from './spec'
import type { ChartExampleSpec } from './spec'

// Static rather than derived from the registry -- filtering on the built-in
// file.ext property lists every .base file in the vault (including future
// chart types) with no per-chart-type data to keep in sync. Confirmed
// working in bck-685.5's Phase 0 spike. Embedded as an inline ```base fence
// in Directory.md (rather than a standalone Directory.base + ![[embed]])
// so the index has no second file to keep track of. file.folder is exposed
// alongside file.name since every example's file name is just "Basic.base"
// -- file.folder is what actually distinguishes rows in cards/list view.
const DIRECTORY_BASE_YAML = `filters:
  and:
    - file.ext == "base"
properties:
  file.folder:
    displayName: Chart type
views:
  - type: cards
    name: Chart types (cards)
    order:
      - file.name
      - file.folder
  - type: list
    name: Chart types (list)
    order:
      - file.name
      - file.folder
`

function primaryVariantPath(spec: ChartExampleSpec): string {
  const [firstVariant] = spec.variants
  if (!firstVariant) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`Chart type "${spec.chartType}" has no variants`)
  }
  return variantRelativePath(spec.chartType, firstVariant)
}

function buildDirectoryMarkdown(specs: readonly ChartExampleSpec[]): string {
  const bulletLines = R.pipe(
    specs,
    R.sortBy(spec => spec.chartType),
    R.map(spec => `- **[[${primaryVariantPath(spec)}|${spec.chartType}]]** — ${spec.description}`),
  )

  return [
    '# Bases Chart Kit example vault',
    '',
    'This vault demonstrates every chart type supported by Bases Chart Kit. Each folder is a self-contained example: the chart type\'s `.base` file(s) plus the backing notes they read from.',
    '',
    'Browse every example `.base` file interactively:',
    '',
    '```base',
    DIRECTORY_BASE_YAML.trimEnd(),
    '```',
    '',
    '## Chart types',
    '',
    ...bulletLines,
    '',
  ].join('\n')
}

// Always built from the full registry (not whatever subset a --chart-type
// filter selected for regeneration) so a partial run never leaves the index
// reflecting only the chart types it happened to touch.
export async function writeDirectoryIndex(specs: readonly ChartExampleSpec[], vaultRoot: string): Promise<void> {
  await fs.writeFile(path.join(vaultRoot, 'Directory.md'), buildDirectoryMarkdown(specs))
}
