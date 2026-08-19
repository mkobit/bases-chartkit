#!/usr/bin/env bun
// Ratchets the total count of ESLint disable-comment directives across the
// repo against .eslint-disable-budget. The count must move in lockstep with
// that file in either direction -- growing it means a new eslint-disable
// slipped in and needs a human to notice and approve the bump in review;
// shrinking it without lowering the file would let the count silently creep
// back up later without anyone seeing a diff.
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as R from 'remeda'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const BUDGET_FILE = path.join(ROOT_DIR, '.eslint-disable-budget')
const SOURCE_GLOB_PATTERNS = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'] as const
const IGNORED_DIR_PREFIXES = [
  'node_modules/',
  'dist/',
  'coverage/',
  'playwright-report/',
  'test-results/',
  '.beads/',
  '.obsidian-cache/',
  '.claude/worktrees/',
  'bases-chartkit-example-vault/',
] as const

// Matches an actual ESLint disable directive at the start of a comment body
// (`// eslint-disable-next-line ...`, `/* eslint-disable ... */`, etc.) --
// NOT prose that merely mentions "eslint-disable" mid-sentence, like a few
// comments in eslint.config.mts itself do.
const DISABLE_DIRECTIVE_PATTERN = /^\s*(\/\/|\/\*)\s*eslint-disable(-next-line|-line)?\b/

async function listSourceFiles(): Promise<readonly string[]> {
  const matches = await Promise.all(
    SOURCE_GLOB_PATTERNS.map(pattern => Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: ROOT_DIR }))),
  )
  return matches.flat().filter(relativePath => !IGNORED_DIR_PREFIXES.some(prefix => relativePath.startsWith(prefix)))
}

async function countDisableDirectives(): Promise<number> {
  const relativePaths = await listSourceFiles()
  const contents = await Promise.all(relativePaths.map(relativePath => fs.readFile(path.join(ROOT_DIR, relativePath), 'utf-8')))
  return R.sumBy(contents, content => content.split('\n').filter(line => DISABLE_DIRECTIVE_PATTERN.test(line)).length)
}

async function main(): Promise<void> {
  const budgetText = await fs.readFile(BUDGET_FILE, 'utf-8')
  const budget = Number(budgetText.trim())
  const actual = await countDisableDirectives()

  if (actual === budget) {
    console.log(`ESLint disable-comment budget OK: ${actual} directive(s), matches ${path.basename(BUDGET_FILE)}.`)
    return
  }

  const relativeBudgetFile = path.relative(ROOT_DIR, BUDGET_FILE)

  if (actual > budget) {
    console.error(
      `ESLint disable-comment budget exceeded: ${relativeBudgetFile} says ${budget}, but the repo has ${actual}.\n\n`
      + 'Every eslint-disable comment needs a genuine, reviewed reason, not a shortcut past a rule. '
      + `If this new one is justified, bump the budget in the same PR: echo ${actual} > ${relativeBudgetFile}`,
    )
    process.exit(1)
  }

  console.error(
    `ESLint disable-comment budget stale: ${relativeBudgetFile} says ${budget}, but the repo only has ${actual}.\n\n`
    + `Fewer disable comments than before -- lower the budget to match so the count can't silently grow back up later: echo ${actual} > ${relativeBudgetFile}`,
  )
  process.exit(1)
}

main().catch((err: unknown) => {
  console.error('Fatal error checking eslint-disable budget:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
