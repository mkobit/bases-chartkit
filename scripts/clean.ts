#!/usr/bin/env bun
// Removes known generated/build/test-output dirs, cross-checked against .gitignore.
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')

const CLEAN_TARGETS = [
  'main.js',
  'test-results',
  'playwright-report',
  '.test-output',
  '.obsidian-cache',
  'coverage',
] as const

async function main(): Promise<void> {
  await Promise.all(
    CLEAN_TARGETS.map(target => fs.rm(path.join(ROOT_DIR, target), { recursive: true, force: true })),
  )
  console.log(`Removed: ${CLEAN_TARGETS.join(', ')}`)
}

main().catch((err: unknown) => {
  console.error('Fatal error in clean:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
