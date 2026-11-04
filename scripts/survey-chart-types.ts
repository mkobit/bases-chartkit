#!/usr/bin/env bun
// Manual dev tool (not part of the CI e2e suite). Launches a single Obsidian
// instance, sweeps every chart view across every `.base` file in the example
// vault using Bun.YAML directly, and screenshots each one for use in
// docs/chart-types.md.
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
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import * as R from 'remeda'
import type { ViewMode } from '../shared/appearance'
import { connectCdp } from '../e2e/cdp/client'
import { createObsidianPage } from '../e2e/fixtures/obsidian'
import type { ObsidianPage } from '../e2e/fixtures/obsidian'
import { evaluateObsidian, waitForChartFinished, waitForVaultIndexed } from '../e2e/helpers/evaluate'
import { launchObsidianForSuite, stopObsidian, waitForCdpReady } from './run-e2e'

type SurveyPage = ObsidianPage['page']

export const ROOT_DIR = path.resolve(import.meta.dirname, '..')
export const VAULT_DIR = path.join(ROOT_DIR, 'bases-chartkit-example-vault')

interface BaseView {
  readonly type: string
  readonly name: string
}

export interface ChartViewEntry {
  readonly baseFile: string
  readonly viewName: string
  readonly chartType: string
}

export interface ResolvedSurveyTheme {
  readonly theme: ViewMode | undefined
  readonly outputDir: string
  readonly warning?: string
}

// SURVEY_THEME=dark switches both the launched Obsidian instance's color
// scheme and the output directory -- set by the docs:screenshots:dark(:headless)
// npm scripts, unset (light) by the plain docs:screenshots(:headless) ones.
export function resolveSurveyTheme(
  rawSurveyTheme: string | undefined = process.env.SURVEY_THEME,
  rootDir: string = ROOT_DIR,
): ResolvedSurveyTheme {
  const warning = rawSurveyTheme !== undefined && rawSurveyTheme !== 'dark'
    ? `[survey-chart-types] SURVEY_THEME=${rawSurveyTheme} is not "dark"; falling back to light mode\n`
    : undefined
  const theme: ViewMode | undefined = rawSurveyTheme === 'dark' ? 'dark' : undefined
  const outputDir = theme === 'dark'
    ? path.join(rootDir, '.test-output', 'chart-types-dark')
    : path.join(rootDir, 'docs', 'images', 'chart-types')
  return {
    theme,
    outputDir,
    ...(warning !== undefined ? { warning } : {}),
  }
}

// fs.readdirSync's recursive:true overload types its result as
// `string[] | NonSharedBuffer[]` (the Buffer branch only actually occurs
// when `encoding: 'buffer'` is passed, which it isn't here) -- this guard
// proves the string branch without a cast.
const isEntryName = (entry: string | Buffer): entry is string => typeof entry === 'string'

const isBaseView = (value: unknown): value is BaseView => {
  if (value === null || typeof value !== 'object') {
    return false
  }
  return 'type' in value && 'name' in value && typeof value.type === 'string' && typeof value.name === 'string'
}

// Narrows the parsed YAML document down to its `views` array without casting
// -- Bun.YAML.parse returns `unknown`, so this is the boundary that proves
// `views` exists and is an array before any element-level narrowing happens.
const getViews = (parsed: unknown): ReadonlyArray<unknown> => {
  if (parsed === null || typeof parsed !== 'object' || !('views' in parsed) || !Array.isArray(parsed.views)) {
    return []
  }
  return parsed.views
}

/**
 * Collects chart view entries across every `.base` file in the vault directory
 * using `Bun.YAML.parse`.
 */
export function collectChartViews(vaultDir: string = VAULT_DIR): ReadonlyArray<ChartViewEntry> {
  const baseFiles = R.pipe(
    fs.readdirSync(vaultDir, { recursive: true }),
    R.filter(isEntryName),
    R.filter(name => name.endsWith('.base')),
    R.sort((a, b) => a.localeCompare(b)),
  )

  return R.pipe(
    baseFiles,
    R.flatMap((baseFile) => {
      const raw = fs.readFileSync(path.join(vaultDir, baseFile), 'utf8')
      const parsed = Bun.YAML.parse(raw)
      return R.pipe(
        getViews(parsed),
        R.filter(isBaseView),
        R.map(view => ({ baseFile, viewName: view.name, chartType: view.type })),
      )
    }),
  )
}

export const kebabSlug = (value: string): string =>
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
export const baseFileSlug = (baseFile: string): string => {
  const parts = baseFile.replace(/\.base$/, '').split('/')
  const first = parts[0]
  if (first === undefined) {
    return kebabSlug(baseFile)
  }
  const last = parts[parts.length - 1] ?? first
  return kebabSlug(first === last ? first : `${first}-${last}`)
}

export const screenshotFileName = (entry: ChartViewEntry): string => {
  const baseSlug = baseFileSlug(entry.baseFile)
  const viewSlug = kebabSlug(entry.viewName)
  return `${baseSlug}--${viewSlug}.png`
}

export interface CaptureResult {
  readonly entry: ChartViewEntry
  readonly fileName: string
  readonly ok: boolean
  readonly error?: string
}

// Per-view budget for the whole setViewState-render-screenshot sequence.
// `page.evaluate` (which `evaluateObsidian` wraps) has no built-in timeout --
// if a chart type's onload hangs the renderer instead of throwing, the
// `await` would otherwise block indefinitely with nothing left to catch it.
// Racing against this per-view timeout keeps one stuck view from stalling
// the rest of the sweep.
export const PER_VIEW_TIMEOUT_MS = 45_000
export const CANVAS_MOUNT_TIMEOUT_MS = 30_000

function fail(message: string): never {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain new Error(...); pre-existing false positive, see e2e/fixtures/obsidian.ts.
  throw new Error(message)
}

async function timeoutAfter(ms: number, label: string): Promise<never> {
  await Bun.sleep(ms)
  fail(`timed out after ${ms}ms waiting on: ${label}`)
}

async function waitForCanvasPresent(page: SurveyPage, timeoutMs: number = CANVAS_MOUNT_TIMEOUT_MS): Promise<void> {
  const startTime = Temporal.Now.instant().epochMilliseconds
  const deadline = startTime + timeoutMs

  const poll = async (): Promise<void> => {
    const count = await page.locator('.bases-echarts canvas').count()
    if (count > 0) {
      return
    }
    const now = Temporal.Now.instant().epochMilliseconds
    if (now >= deadline) {
      fail(`Timed out after ${timeoutMs}ms waiting for .bases-echarts canvas`)
    }
    await Bun.sleep(100)
    return poll()
  }

  return poll()
}

interface CanvasBounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Queries the bounding rectangle of the first `.bases-echarts canvas` element
 * and captures a clipped PNG screenshot via CDP.
 */
export async function captureCanvasScreenshot(page: SurveyPage, outputPath: string): Promise<void> {
  const bounds = await page.evaluate<CanvasBounds | null>(() => {
    const el = document.querySelector('.bases-echarts canvas')
    if (!el) {
      return null
    }
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return null
    }
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    }
  })

  if (bounds === null) {
    fail('Could not determine bounding rectangle for .bases-echarts canvas')
  }

  const buffer = await page.screenshot({
    format: 'png',
    clip: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      scale: 1,
    },
  })

  await fsp.writeFile(outputPath, buffer)
}

/**
 * Renders one (file, view) pair on the shared leaf and screenshots its chart
 * canvas. Wrapped in a try/catch so one view that fails to render doesn't
 * abort the rest of the sweep.
 */
export async function captureView(
  page: SurveyPage,
  entry: ChartViewEntry,
  outputDir: string,
  perViewTimeoutMs: number = PER_VIEW_TIMEOUT_MS,
): Promise<CaptureResult> {
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

        await waitForCanvasPresent(page)

        // Without this, the screenshot can land mid entrance-animation --
        // the same deterministically-seeded data still renders a different
        // frame depending on capture timing, producing spurious pixel diffs
        // between runs (see waitForChartFinished's doc comment).
        await waitForChartFinished(page)

        await captureCanvasScreenshot(page, path.join(outputDir, fileName))
      })(),
      timeoutAfter(perViewTimeoutMs, `${entry.baseFile} :: ${entry.viewName}`),
    ])

    process.stderr.write(`[survey-chart-types] ok: ${entry.baseFile} :: ${entry.viewName}\n`)
    return { entry, fileName, ok: true }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`[survey-chart-types] failed to capture "${entry.viewName}" (${entry.baseFile}, type=${entry.chartType}): ${message}\n`)
    return { entry, fileName, ok: false, error: message }
  }
}

/**
 * Launches Obsidian, waits for workspace layout and vault indexing, and
 * captures screenshots for all chart views sequentially.
 */
export async function runSurvey(): Promise<number> {
  const { theme, outputDir, warning } = resolveSurveyTheme()
  if (warning !== undefined) {
    process.stderr.write(warning)
  }

  const entries = collectChartViews()
  fs.mkdirSync(outputDir, { recursive: true })

  const launched = await launchObsidianForSuite({
    name: theme === 'dark' ? 'dark' : 'standard',
    theme,
    files: [],
  })

  try {
    await waitForCdpReady(launched.port, launched.proc)
    const client = await connectCdp(launched.port)

    try {
      const page = createObsidianPage(client)

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
      // of the window while metadataCache resolution catches up. Waiting it
      // out here, once, before the sweep starts, keeps that banner off of
      // every capture.
      await waitForVaultIndexed(page)

      // Sequential by design: one Obsidian instance, one workspace leaf, reused
      // across all views. Reduce-over-a-promise chains each capture after the
      // previous one settles, appending immutably instead of mutating an
      // accumulator array.
      const results = await entries.reduce(
        async (accPromise, entry) => {
          const acc = await accPromise
          const result = await captureView(page, entry, outputDir)
          return [...acc, result]
        },
        Promise.resolve<ReadonlyArray<CaptureResult>>([]),
      )

      const succeeded = results.filter(r => r.ok)
      const failed = results.filter(r => !r.ok)

      process.stderr.write(`[survey-chart-types] captured ${succeeded.length}/${entries.length} screenshots\n`)
      if (failed.length > 0) {
        process.stderr.write('[survey-chart-types] failures:\n')
        for (const failure of failed) {
          process.stderr.write(`  - ${failure.entry.baseFile} :: ${failure.entry.viewName} (type=${failure.entry.chartType}): ${failure.error ?? 'unknown error'}\n`)
        }
      }

      return succeeded.length > 0 ? 0 : 1
    }
    finally {
      await client.close()
    }
  }
  finally {
    launched.removeSignalHandlers()
    await stopObsidian(launched.proc, launched.configDir, launched.vault)
  }
}

async function main(): Promise<void> {
  const exitCode = await runSurvey()
  process.exit(exitCode)
}

if (import.meta.main) {
  main().catch((err: unknown) => {
    console.error('Fatal error in survey-chart-types:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}
