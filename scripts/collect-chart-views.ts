#!/usr/bin/env bun
// Reads every `.base` file in the example vault and writes their flattened
// chart views to a JSON file for e2e/survey/chart-types.survey.ts to consume.
// Runs under plain `bun run` (not Playwright's test runner) because
// Bun's built-in YAML.parse is only available in that context -- see the
// comment in chart-types.survey.ts for why the split exists.
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as R from 'remeda'
import { YAML } from 'bun'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const VAULT_DIR = path.join(ROOT_DIR, 'bases-chartkit-example-vault')
const OUTPUT_PATH = path.join(ROOT_DIR, '.test-output', 'chart-views.json')

interface BaseView {
  readonly type: string
  readonly name: string
}

export interface ChartViewEntry {
  readonly baseFile: string
  readonly viewName: string
  readonly chartType: string
}

const isBaseView = (value: unknown): value is BaseView => {
  if (value === null || typeof value !== 'object') {
    return false
  }
  return 'type' in value && 'name' in value && typeof value.type === 'string' && typeof value.name === 'string'
}

// Narrows the parsed YAML document down to its `views` array without casting
// -- YAML.parse returns `unknown`, so this is the boundary that proves
// `views` exists and is an array before any element-level narrowing happens.
const getViews = (parsed: unknown): ReadonlyArray<unknown> => {
  if (parsed === null || typeof parsed !== 'object' || !('views' in parsed) || !Array.isArray(parsed.views)) {
    return []
  }
  return parsed.views
}

function collectChartViews(): ReadonlyArray<ChartViewEntry> {
  const baseFiles = R.pipe(
    fs.readdirSync(VAULT_DIR),
    R.filter(name => name.endsWith('.base')),
    R.sort((a, b) => a.localeCompare(b)),
  )

  return R.pipe(
    baseFiles,
    R.flatMap((baseFile) => {
      const raw = fs.readFileSync(path.join(VAULT_DIR, baseFile), 'utf8')
      const parsed = YAML.parse(raw)
      return R.pipe(
        getViews(parsed),
        R.filter(isBaseView),
        R.map(view => ({ baseFile, viewName: view.name, chartType: view.type })),
      )
    }),
  )
}

const entries = collectChartViews()
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2))
console.log(`Wrote ${entries.length} chart view entries to ${OUTPUT_PATH}`)
