import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { createNote, writeNoteToVault } from '../../e2e/vault'
import type { NoteDefinition } from '../../e2e/vault/schema'
import { buildBaseFileYaml } from './base-file-serializer'
import { variantRelativePath } from './spec'
import type { ChartExampleSpec, ChartVariantSpec } from './spec'

function padIndex(index: number, total: number): string {
  const width = String(total - 1).length
  return String(index).padStart(width, '0')
}

function variantFilePath(vaultRoot: string, chartType: string, variant: ChartVariantSpec, variantCount: number): string {
  return path.join(vaultRoot, variantRelativePath(chartType, variant, variantCount))
}

function buildNotes(spec: ChartExampleSpec, seed: number): readonly NoteDefinition[] {
  const rows = spec.sampleRows(seed)

  return rows.map((frontmatter, index) =>
    createNote(
      path.join(spec.chartType, 'notes', `${spec.notePrefix}-${padIndex(index, rows.length)}.md`),
      frontmatter,
    ))
}

// Wipes everything under the chart-type directory except a top-level
// `assets/` subfolder -- writeChartTypeDirectory recreates notes and .base
// files from scratch every run, and clearing the whole tree (rather than
// picking off notes/ and top-level .base files individually) is what
// actually cleans up a variant's slugged subdirectory (see variantFilePath)
// if a prior generation left one behind under a name the current spec no
// longer uses. `assets/` is excluded because it holds static, hand-authored
// files with no fast-check arbitrary to regenerate them from (e.g.
// map-chart's GeoJSON) -- wiping it on every run would silently delete data
// this script can't recreate.
async function clearChartTypeDirectory(vaultRoot: string, chartType: string): Promise<void> {
  const dir = path.join(vaultRoot, chartType)
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  await Promise.all(
    entries
      .filter(entry => entry.name !== 'assets')
      .map(entry => fs.rm(path.join(dir, entry.name), { recursive: true, force: true })),
  )
}

export interface WriteResult {
  readonly chartType: string
  readonly noteCount: number
  readonly baseFileCount: number
}

export async function writeChartTypeDirectory(
  spec: ChartExampleSpec,
  seed: number,
  vaultRoot: string,
): Promise<WriteResult> {
  await clearChartTypeDirectory(vaultRoot, spec.chartType)

  const notes = buildNotes(spec, seed)
  const writeErrors = await Promise.all(notes.map(note => writeNoteToVault(vaultRoot, note)))
  const failures = writeErrors.filter((err): err is Error => err instanceof Error)
  if (failures.length > 0) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`Failed to write ${failures.length} note(s) for ${spec.chartType}: ${failures.map(e => e.message).join('; ')}`)
  }

  await Promise.all(spec.variants.map(async (variant) => {
    const baseFilePath = variantFilePath(vaultRoot, spec.chartType, variant, spec.variants.length)
    await fs.mkdir(path.dirname(baseFilePath), { recursive: true })
    await fs.writeFile(baseFilePath, buildBaseFileYaml(spec.chartType, variant))
  }))

  return {
    chartType: spec.chartType,
    noteCount: notes.length,
    baseFileCount: spec.variants.length,
  }
}

export async function writeAllChartTypeDirectories(
  specs: readonly ChartExampleSpec[],
  seed: number,
  vaultRoot: string,
): Promise<readonly WriteResult[]> {
  return Promise.all(specs.map(spec => writeChartTypeDirectory(spec, seed, vaultRoot)))
}
