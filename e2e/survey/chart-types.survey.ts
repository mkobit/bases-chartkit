// Manual dev tool (not part of the CI e2e suite -- see the `.survey.ts`
// extension and playwright.survey.config.ts). Launches a single Obsidian
// instance, sweeps every chart view across every `.base` file in the example
// vault, and screenshots each one for use in docs/chart-types.md.
//
// Run via `bun run docs:screenshots` / `bun run docs:screenshots:headless`
// for the light-mode set docs/chart-types.md embeds, or
// `bun run docs:screenshots:dark` / `:dark:headless` for a dark-mode pass.
// BaseChartView picks its ECharts theme from Obsidian's own dark/light mode
// (src/views/base-chart-view.ts's isDarkMode()/getTheme()), so chart
// appearance is genuinely theme-dependent, not just a CSS pass-through --
// the dark pass is a real, separate rendering of every chart type, not a
// filter over the same screenshots. Written to .test-output/ rather than
// docs/images/ since docs/chart-types.md currently embeds only one image per
// chart type (light) -- these are for manual visual review, not doc
// embedding, until/unless that changes.
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as R from 'remeda'
import type { Page } from '@playwright/test'
import { test, expect } from '../fixtures/obsidian'
import { evaluateObsidian, waitForChartFinished, waitForVaultIndexed } from '../helpers/evaluate'

const ROOT_DIR = path.resolve(import.meta.dirname, '../../')
const CHART_VIEWS_PATH = path.join(ROOT_DIR, '.test-output', 'chart-views.json')

// SURVEY_THEME=dark switches both the launched Obsidian instance's color
// scheme (via the theme fixture option) and the output directory -- set by
// the docs:screenshots:dark(:headless) npm scripts, unset (light) by the
// plain docs:screenshots(:headless) ones.
const rawSurveyTheme = process.env.SURVEY_THEME
if (rawSurveyTheme !== undefined && rawSurveyTheme !== 'dark') {
  process.stderr.write(`[chart-types.survey] SURVEY_THEME=${rawSurveyTheme} is not "dark"; falling back to light mode\n`)
}
const SURVEY_THEME = rawSurveyTheme === 'dark' ? 'dark' : undefined
const OUTPUT_DIR = SURVEY_THEME === 'dark'
  ? path.join(ROOT_DIR, '.test-output', 'chart-types-dark')
  : path.join(ROOT_DIR, 'docs', 'images', 'chart-types')

interface ChartViewEntry {
  readonly baseFile: string
  readonly viewName: string
  readonly chartType: string
}

// `Array.isArray`'s lib.d.ts signature narrows to `any[]`, not `unknown[]` --
// this wrapper re-narrows to a real `unknown` element type so nothing
// downstream silently becomes `any`.
const isUnknownArray = (value: unknown): value is ReadonlyArray<unknown> => Array.isArray(value)

const isChartViewEntry = (value: unknown): value is ChartViewEntry => {
  if (value === null || typeof value !== 'object') {
    return false
  }
  return 'baseFile' in value && 'viewName' in value && 'chartType' in value
    && typeof value.baseFile === 'string' && typeof value.viewName === 'string' && typeof value.chartType === 'string'
}

// Chart-view entries are collected by `bun scripts/collect-chart-views.ts`
// (run first by the `docs:screenshots` npm scripts) rather than parsed here
// -- Bun's built-in YAML.parse is not available inside Playwright's
// test-worker process (confirmed: both the `Bun` global and
// `import { YAML } from 'bun'` fail to resolve there even though the CLI
// itself is invoked via `bun x`), so YAML parsing has to happen in a plain
// `bun run` step and hand its result off as JSON.
function readChartViews(): ReadonlyArray<ChartViewEntry> {
  if (!fs.existsSync(CHART_VIEWS_PATH)) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`${CHART_VIEWS_PATH} not found -- run \`bun scripts/collect-chart-views.ts\` first (the docs:screenshots npm scripts do this automatically)`)
  }
  const raw = fs.readFileSync(CHART_VIEWS_PATH, 'utf8')
  const parsed: unknown = JSON.parse(raw)
  if (!isUnknownArray(parsed)) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- same pre-existing false positive as above.
    throw new Error(`${CHART_VIEWS_PATH} did not contain a JSON array`)
  }
  return R.filter(parsed, isChartViewEntry)
}

const kebabSlug = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')

// Drops any middle path segment(s) -- for a multi-variant chart type,
// baseFile looks like "effect-scatter/sized-by-population/Sized-By-
// Population.base": the middle "sized-by-population" directory is always
// just the file stem lowercased (see scripts/vault-gen/spec.ts's
// variantRelativePath), so keeping it would kebab-slug to a redundant
// "effect-scatter-sized-by-population-sized-by-population". Single-variant
// chart types have no middle segment, so first === last and this is a no-op.
const baseFileSlug = (baseFile: string): string => {
  const parts = baseFile.replace(/\.base$/, '').split('/')
  const first = parts[0]
  if (first === undefined) {
    return kebabSlug(baseFile)
  }
  const last = parts[parts.length - 1] ?? first
  return kebabSlug(first === last ? first : `${first}-${last}`)
}

const screenshotFileName = (entry: ChartViewEntry): string => {
  const baseSlug = baseFileSlug(entry.baseFile)
  const viewSlug = kebabSlug(entry.viewName)
  return `${baseSlug}--${viewSlug}.png`
}

interface CaptureResult {
  readonly entry: ChartViewEntry
  readonly fileName: string
  readonly ok: boolean
  readonly error?: string
}

// Per-view budget for the whole setViewState-render-screenshot sequence.
// `page.evaluate` (which `evaluateObsidian` wraps) has no built-in timeout --
// if a chart type's onload hangs the renderer instead of throwing, the
// `await` would otherwise block indefinitely with nothing left to catch it
// short of the whole-test timeout. Racing against this per-view timeout
// keeps one stuck view from stalling the rest of the sweep.
const PER_VIEW_TIMEOUT_MS = 45_000

function timeoutAfter(ms: number, label: string): Promise<never> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error(`timed out after ${ms}ms waiting on: ${label}`)), ms)
  })
}

// Renders one (file, view) pair on the shared leaf and screenshots its chart
// canvas. Wrapped by the caller in a try/catch so one view that fails to
// render (some chart types have known open rendering bugs) doesn't abort the
// rest of the sweep.
async function captureView(page: Page, entry: ChartViewEntry): Promise<CaptureResult> {
  const fileName = screenshotFileName(entry)
  try {
    await Promise.race([
      (async () => {
        // Reuses the single tab opened before the loop started: getLeaf(false)
        // returns an existing navigable leaf rather than creating a new one
        // (unlike getLeaf('tab'), which always opens a fresh tab -- calling
        // that once per view would leak 36 tabs over the sweep).
        await evaluateObsidian(page, async (app, args: { path: string, viewName: string }) => {
          const leaf = app.workspace.getLeaf(false)
          await leaf.setViewState({
            type: 'bases',
            state: { file: args.path, viewName: args.viewName },
            active: true,
          })
        }, { path: entry.baseFile, viewName: entry.viewName })

        await expect.poll(
          async () => page.locator('.bases-echarts canvas').count(),
          { timeout: 30_000 },
        ).toBeGreaterThan(0)

        // Without this, the screenshot can land mid entrance-animation --
        // the same deterministically-seeded data still renders a different
        // frame depending on capture timing, producing spurious pixel diffs
        // between runs (see waitForChartFinished's doc comment).
        await waitForChartFinished(page)

        const canvas = page.locator('.bases-echarts canvas').first()
        await canvas.screenshot({ path: path.join(OUTPUT_DIR, fileName) })
      })(),
      timeoutAfter(PER_VIEW_TIMEOUT_MS, `${entry.baseFile} :: ${entry.viewName}`),
    ])

    process.stderr.write(`[chart-types.survey] ok: ${entry.baseFile} :: ${entry.viewName}\n`)
    return { entry, fileName, ok: true }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`[chart-types.survey] failed to capture "${entry.viewName}" (${entry.baseFile}, type=${entry.chartType}): ${message}\n`)
    return { entry, fileName, ok: false, error: message }
  }
}

test.use({ theme: SURVEY_THEME })

test(`capture chart-type screenshots (${SURVEY_THEME ?? 'light'})`, async ({ obsidianPage: { page } }) => {
  const entries = readChartViews()
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // Waits for the workspace to finish loading, then opens the single tab
  // that every subsequent capture reuses via getLeaf(false) (see captureView).
  await evaluateObsidian(page, async (app) => {
    await new Promise<void>((resolve) => {
      app.workspace.onLayoutReady(() => resolve())
    })
    app.workspace.getLeaf('tab')
  })

  // onLayoutReady alone doesn't mean the vault has finished indexing --
  // Obsidian keeps an "Indexing vault..." status banner visible at the top
  // of the window while metadataCache resolution catches up (this example
  // vault's calendar/heatmap/theme-river dirs alone add hundreds of notes;
  // see VAULT_INDEXED_POLL_TIMEOUT_MS's doc comment). Root-caused for bck-6gf:
  // that banner overlapping the first few captured canvases -- always the
  // same fixed pixel footprint regardless of chart content, landing on
  // whichever chart(s) happen to be mid-capture during the indexing window --
  // was the exact-same-diff-footprint anomaly across unrelated chart types
  // both here and in the original bug report. Waiting it out here, once,
  // before the sweep starts, keeps that banner off of every capture instead
  // of at the mercy of how far the sweep gets before indexing finishes.
  await waitForVaultIndexed(page)

  // Sequential by design: one Obsidian instance, one workspace leaf, reused
  // across all views (36 separate `test()` launches would be prohibitively
  // slow). Reduce-over-a-promise chains each capture after the previous one
  // settles, appending immutably instead of mutating an accumulator array.
  const results = await entries.reduce(
    async (accPromise, entry) => {
      const acc = await accPromise
      const result = await captureView(page, entry)
      return [...acc, result]
    },
    Promise.resolve<ReadonlyArray<CaptureResult>>([]),
  )

  const succeeded = results.filter(r => r.ok)
  const failed = results.filter(r => !r.ok)

  process.stderr.write(`[chart-types.survey] captured ${succeeded.length}/${entries.length} screenshots\n`)
  if (failed.length > 0) {
    process.stderr.write('[chart-types.survey] failures:\n')
    for (const failure of failed) {
      process.stderr.write(`  - ${failure.entry.baseFile} :: ${failure.entry.viewName} (type=${failure.entry.chartType}): ${failure.error ?? 'unknown error'}\n`)
    }
  }

  // The sweep's purpose is to gather as many screenshots as possible for docs
  // regeneration, not to gate CI -- a partial run is still useful, so this
  // never fails the test even if some views errored.
  expect(succeeded.length).toBeGreaterThan(0)
})
