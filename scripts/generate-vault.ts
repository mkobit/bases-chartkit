import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as readline from 'node:readline/promises'
import { VaultBuilder, writeNoteToVault } from '../e2e/vault'
import {
  salesDataset,
  ganttDataset,
  stockDataset,
  scoreDataset,
  countryDataset,
  characterDataset,
  serverMetricsDataset,
} from '../e2e/fixtures/datasets'

const OUTPUT_DIR = path.join(__dirname, '../example/Charts')

async function confirmAction(promptText: string): Promise<boolean> {
  if (process.argv.includes('--force') || process.argv.includes('-f')) {
    return true
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`${promptText} [y/N]: `)
  rl.close()
  return answer.toLowerCase().trim() === 'y'
}

async function clearMarkdownFiles(dir: string): Promise<void> {
  try {
    const files = await fs.readdir(dir, { recursive: true })
    for (const file of files) {
      if (file.endsWith('.md')) {
        await fs.rm(path.join(dir, file))
      }
    }
  }
  catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}

async function main() {
  const confirmed = await confirmAction(`Are you sure you want to clear markdown files in ${OUTPUT_DIR}?`)
  if (!confirmed) {
    console.log('Aborted.')
    process.exit(0)
  }

  console.log(`Clearing existing markdown files in ${OUTPUT_DIR}...`)
  await clearMarkdownFiles(OUTPUT_DIR)

  console.log('Generating new vault data...')
  const builder = VaultBuilder.create()
    .withNotes(salesDataset)
    .withNotes(ganttDataset)
    .withNotes(stockDataset)
    .withNotes(scoreDataset)
    .withNotes(countryDataset)
    .withNotes(characterDataset)
    .withNotes(serverMetricsDataset)

  const results = await Promise.all(builder.getNotes().map(note => writeNoteToVault(OUTPUT_DIR, note)))
  const errors = results.filter((err): err is Error => err instanceof Error)

  if (errors.length > 0) {
    console.error('Errors encountered during generation:')
    for (const err of errors) {
      console.error(err)
    }
    process.exit(1)
  }

  console.log('\nGeneration Summary:')
  console.log(`- Sales Notes: ${salesDataset.length}`)
  console.log(`- Gantt Task Notes: ${ganttDataset.length}`)
  console.log(`- Stock Price Notes: ${stockDataset.length}`)
  console.log(`- Academic Score Notes: ${scoreDataset.length}`)
  console.log(`- Country Stat Notes: ${countryDataset.length}`)
  console.log(`- RPG Character Notes: ${characterDataset.length}`)
  console.log(`- Server Metric Notes: ${serverMetricsDataset.length}`)
  console.log(`\nTotal notes generated: ${
    salesDataset.length
    + ganttDataset.length
    + stockDataset.length
    + scoreDataset.length
    + countryDataset.length
    + characterDataset.length
    + serverMetricsDataset.length
  }`)
  console.log('\nVault generated successfully!')
}

main().catch((error) => {
  console.error('Failed to generate vault:', error)
  process.exit(1)
})
