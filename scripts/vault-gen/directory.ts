import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as R from 'remeda'
import { variantRelativePath } from './spec'
import type { ChartExampleSpec } from './spec'

// Static rather than derived from the registry -- a plain Bases table view
// filtering on the built-in file.ext property lists every .base file in the
// vault (including itself and future chart types) with no per-chart-type
// data to keep in sync. Confirmed working in bck-685.5's Phase 0 spike.
const DIRECTORY_BASE_YAML = `views:
  - type: table
    name: All example bases
    order:
      - file.name
      - file.path
    filters:
      and:
        - file.ext == "base"
`

function primaryVariantPath(spec: ChartExampleSpec): string {
  const [firstVariant] = spec.variants
  if (!firstVariant) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`Chart type "${spec.chartType}" has no variants`)
  }
  return variantRelativePath(spec.chartType, firstVariant, spec.variants.length)
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
    '![[Directory.base]]',
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
  await fs.writeFile(path.join(vaultRoot, 'Directory.base'), DIRECTORY_BASE_YAML)
  await fs.writeFile(path.join(vaultRoot, 'Directory.md'), buildDirectoryMarkdown(specs))
}
