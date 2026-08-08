#!/usr/bin/env bun
// Capture a screenshot of the running `vault:dev` Obsidian window via
// Obsidian's official CLI (https://obsidian.md/help/cli).
// Usage: bun scripts/vault-screenshot.ts [output-path]
// Default output: ./.test-output/vault-screenshot.png

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { runObsidianCli } from './obsidian-cli'

const outputPath = path.resolve(process.argv[2] ?? path.join('.test-output', 'vault-screenshot.png'))

async function main(): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  const { stderr, exitCode } = await runObsidianCli(['dev:screenshot', `path=${outputPath}`])
  if (exitCode !== 0) {
    console.error(stderr || 'obsidian-cli dev:screenshot failed — is `bun run vault:dev` running?')
    process.exit(exitCode)
  }
  const { size } = await fs.stat(outputPath)
  console.log(`Screenshot written: ${outputPath} (${size} bytes)`)
}

main().catch((err: unknown) => {
  console.error('Fatal error in vault-screenshot:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
