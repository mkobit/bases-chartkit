#!/usr/bin/env bun
// Ratchets the number of @typescript-eslint/consistent-type-assertions
// violations in tests/** against .test-cast-budget. tests/** keeps the rule
// 'off' in eslint.config.mts (mocking and narrowing into ECharts' deeply-nested
// option union types for assertions is still common there), so this script --
// not the rule itself -- is what stops the count from silently growing.
// Mirrors check-eslint-disable-budget.ts: the count must move in lockstep with
// the budget file in either direction, so both growth and (unrecorded) cleanup
// require a human to notice and approve the change in review.
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { ESLint } from 'eslint'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const BUDGET_FILE = path.join(ROOT_DIR, '.test-cast-budget')
const RULE_ID = '@typescript-eslint/consistent-type-assertions'
const TESTS_GLOB = 'tests/**/*.ts'

async function countTestCasts(): Promise<number> {
  const eslint = new ESLint({
    cwd: ROOT_DIR,
    overrideConfig: {
      files: [TESTS_GLOB],
      rules: {
        [RULE_ID]: 'error',
      },
    },
  })
  const results = await eslint.lintFiles([TESTS_GLOB])
  return results.reduce(
    (sum, result) => sum + result.messages.filter(message => message.ruleId === RULE_ID).length,
    0,
  )
}

async function main(): Promise<void> {
  const budgetText = await fs.readFile(BUDGET_FILE, 'utf-8')
  const budget = Number(budgetText.trim())
  const actual = await countTestCasts()

  if (actual === budget) {
    console.log(`tests/ cast budget OK: ${actual} unaudited type assertion(s), matches ${path.basename(BUDGET_FILE)}.`)
    return
  }

  const relativeBudgetFile = path.relative(ROOT_DIR, BUDGET_FILE)

  if (actual > budget) {
    console.error(
      `tests/ cast budget exceeded: ${relativeBudgetFile} says ${budget}, but tests/ has ${actual}.\n\n`
      + 'New test code should narrow ECharts option/series unions via real discriminant checks '
      + '(e.g. `if (series?.type !== \'gauge\') throw ...`), not an unverified `as` cast. '
      + `If this new one is genuinely unavoidable, bump the budget in the same PR: echo ${actual} > ${relativeBudgetFile}`,
    )
    process.exit(1)
  }

  console.error(
    `tests/ cast budget stale: ${relativeBudgetFile} says ${budget}, but tests/ only has ${actual}.\n\n`
    + `Fewer casts than before -- lower the budget to match so the count can't silently grow back up later: echo ${actual} > ${relativeBudgetFile}`,
  )
  process.exit(1)
}

main().catch((err: unknown) => {
  console.error('Fatal error checking test cast budget:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
