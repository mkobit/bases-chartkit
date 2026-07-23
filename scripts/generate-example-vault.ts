#!/usr/bin/env bun
// Regenerates the example vault's chart-type directories from
// scripts/vault-gen/registry.ts -- one seeded fast-check Arbitrary per
// chart type, deterministically producing both the backing notes and the
// .base file(s) that read them, so the two can never drift out of sync.
//
// Usage: bun run vault:generate [-- --chart-type bar --chart-type line]
import { Command } from 'commander'
import * as path from 'node:path'
import * as readline from 'node:readline/promises'
import { registry } from './vault-gen/registry'
import { writeChartTypeDirectory } from './vault-gen/compiler'
import type { WriteResult } from './vault-gen/compiler'
import { writeDirectoryIndex } from './vault-gen/directory'
import type { ChartExampleSpec } from './vault-gen/spec'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const DEFAULT_VAULT_DIR = path.join(ROOT_DIR, 'bases-chartkit-example-vault')

// Fixed rather than wall-clock time, so a bare `bun run vault:generate`
// reproduces byte-for-byte the same output and gives clean `git diff`s.
const DEFAULT_SEED = 20_260_722

interface CliOptions {
  readonly seed: number
  readonly chartType?: readonly string[]
  readonly dryRun: boolean
  readonly skipConfirm: boolean
  readonly outDir: string
}

function resolveSpecs(specs: readonly ChartExampleSpec[], chartTypeFilter: readonly string[] | undefined): readonly ChartExampleSpec[] {
  if (!chartTypeFilter || chartTypeFilter.length === 0) {
    return specs
  }
  const requested = new Set(chartTypeFilter)
  return specs.filter(spec => requested.has(spec.chartType))
}

async function confirmAction(promptText: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`${promptText} [y/N]: `)
  rl.close()
  return answer.trim().toLowerCase() === 'y'
}

function printPlan(specs: readonly ChartExampleSpec[], seed: number, outDir: string): void {
  console.log(`Seed: ${seed}`)
  console.log(`Output directory: ${outDir}`)
  console.log(`Chart types (${specs.length}): ${specs.map(s => s.chartType).join(', ')}`)
}

function printResults(results: readonly WriteResult[]): void {
  console.log('\nGeneration Summary:')
  for (const result of results) {
    console.log(`- ${result.chartType}: ${result.noteCount} note(s), ${result.baseFileCount} .base file(s)`)
  }
  const totalNotes = results.reduce((sum, r) => sum + r.noteCount, 0)
  console.log(`\nTotal: ${results.length} chart type(s), ${totalNotes} note(s)`)
}

async function main(options: CliOptions): Promise<void> {
  const specs = resolveSpecs(registry, options.chartType)

  if (specs.length === 0) {
    console.error(`No chart types matched --chart-type filter: ${(options.chartType ?? []).join(', ')}`)
    process.exit(1)
  }

  printPlan(specs, options.seed, options.outDir)

  if (options.dryRun) {
    console.log('\n--dry-run: no files written.')
    return
  }

  if (!options.skipConfirm) {
    const confirmed = await confirmAction(`This will clear and regenerate ${specs.length} chart-type director${specs.length === 1 ? 'y' : 'ies'} under ${options.outDir}. Continue?`)
    if (!confirmed) {
      console.log('Aborted.')
      return
    }
  }

  const results = await Promise.all(
    specs.map(spec => writeChartTypeDirectory(spec, options.seed, options.outDir)),
  )

  // Always rebuilt from the full registry, independent of the --chart-type
  // filter above, so Directory.md/.base never drift to reflect only
  // whichever subset of chart types this particular run happened to touch.
  await writeDirectoryIndex(registry, options.outDir)

  printResults(results)
}

const program = new Command()
const EMPTY_CHART_TYPE_LIST: readonly string[] = []

program
  .name('generate-example-vault')
  .description('Regenerate the example vault\'s chart-type directories from scripts/vault-gen/registry.ts')
  .option('-s, --seed <number>', 'Seed for deterministic generation', Number, DEFAULT_SEED)
  .option('--chart-type <slug>', 'Restrict to one chart-type directory (repeatable)', (value: string, previous: readonly string[]) => [...previous, value], EMPTY_CHART_TYPE_LIST)
  .option('--dry-run', 'Print the plan without writing any files', false)
  .option('-y, --skip-confirm', 'Skip the confirmation prompt', false)
  .option('--out-dir <path>', 'Override the output vault directory', DEFAULT_VAULT_DIR)
  .action(async (options: { seed: number, chartType: readonly string[], dryRun: boolean, skipConfirm: boolean, outDir: string }) => {
    await main({
      seed: options.seed,
      chartType: options.chartType,
      dryRun: options.dryRun,
      skipConfirm: options.skipConfirm,
      outDir: options.outDir,
    })
  })

program.parseAsync().catch((error: unknown) => {
  console.error('Fatal error in generate-example-vault:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
