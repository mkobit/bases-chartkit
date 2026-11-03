#!/usr/bin/env bun
/**
 * End-to-end test orchestrator script.
 * Manages Obsidian process lifecycle and executes Bun test suites with Chrome DevTools Protocol.
 */

import ObsidianLauncher from 'obsidian-launcher'
import type { ChildProcess } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as net from 'node:net'
import * as path from 'node:path'
import { applyViewMode } from '../shared/appearance'
import type { ViewMode } from '../shared/appearance'
import { connectCdp, fetchCdpTargets, findPageTarget } from '../e2e/cdp/client'

export const ROOT_DIR = path.resolve(import.meta.dirname, '..')
export const VAULT_PATH = path.join(ROOT_DIR, 'bases-chartkit-example-vault')
export const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')

export const DEFAULT_OBSIDIAN_APP_VERSION = process.env.OBSIDIAN_APP_VERSION ?? '1.13.4'
export const DEFAULT_OBSIDIAN_INSTALLER_VERSION = process.env.OBSIDIAN_INSTALLER_VERSION ?? '1.13.4'

export const SIGTERM_GRACE_PERIOD_MS = 5_000
export const DEFAULT_CDP_TIMEOUT_MS = 60_000
export const DEFAULT_POLL_INTERVAL_MS = 500

export type SuiteName = 'standard' | 'light' | 'dark'

export interface TestSuite {
  readonly name: SuiteName
  readonly theme: ViewMode | undefined
  readonly files: readonly string[]
}

export interface ParsedCliArgs {
  readonly suite?: SuiteName | 'all'
  readonly fileFilters: readonly string[]
  readonly passthroughArgs: readonly string[]
  readonly showHelp: boolean
}

const FLAGS_WITH_VALUE = new Set([
  '--timeout',
  '-t',
  '--reporter',
  '--test-name-pattern',
  '--rerun-each',
])

function isSuiteName(val: string): val is SuiteName | 'all' {
  return val === 'standard' || val === 'light' || val === 'dark' || val === 'all'
}

function parseSuiteValue(value: string | undefined): SuiteName | 'all' {
  if (value === undefined || !isSuiteName(value)) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain new Error(...); pre-existing false positive, see e2e/fixtures/obsidian.ts.
    throw new Error(`--suite must be "standard", "light", "dark", or "all", got: ${String(value)}`)
  }
  return value
}

function parseThemeValue(value: string | undefined): SuiteName {
  if (value !== 'light' && value !== 'dark') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain new Error(...); pre-existing false positive, see e2e/fixtures/obsidian.ts.
    throw new Error(`--theme must be "light" or "dark", got: ${String(value)}`)
  }
  return value
}

/**
 * Parses command line arguments into test orchestrator options.
 */
export function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
  const consume = (
    args: readonly string[],
    acc: ParsedCliArgs,
  ): ParsedCliArgs => {
    if (args.length === 0) {
      return acc
    }

    const first = args[0]
    if (first === undefined) {
      return acc
    }
    const rest = args.slice(1)

    if (first === '--help' || first === '-h') {
      return consume(rest, { ...acc, showHelp: true })
    }

    if (first === '--') {
      const additionalFilters = rest.filter(arg => !arg.startsWith('-'))
      const additionalPassthrough = rest.filter(arg => arg.startsWith('-'))
      return {
        ...acc,
        fileFilters: [...acc.fileFilters, ...additionalFilters],
        passthroughArgs: [...acc.passthroughArgs, ...additionalPassthrough],
      }
    }

    if (first.startsWith('--suite=')) {
      const suite = parseSuiteValue(first.slice('--suite='.length))
      return consume(rest, { ...acc, suite })
    }

    if (first === '--suite' || first === '-s') {
      const suite = parseSuiteValue(rest[0])
      return consume(rest.slice(1), { ...acc, suite })
    }

    if (first.startsWith('-s=')) {
      const suite = parseSuiteValue(first.slice('-s='.length))
      return consume(rest, { ...acc, suite })
    }

    if (first.startsWith('--theme=')) {
      const suite = parseThemeValue(first.slice('--theme='.length))
      return consume(rest, { ...acc, suite })
    }

    if (first === '--theme') {
      const suite = parseThemeValue(rest[0])
      return consume(rest.slice(1), { ...acc, suite })
    }

    if (first.startsWith('-')) {
      if (FLAGS_WITH_VALUE.has(first)) {
        const nextArg = rest[0]
        if (nextArg !== undefined && !nextArg.startsWith('-')) {
          return consume(rest.slice(1), {
            ...acc,
            passthroughArgs: [...acc.passthroughArgs, first, nextArg],
          })
        }
      }
      return consume(rest, {
        ...acc,
        passthroughArgs: [...acc.passthroughArgs, first],
      })
    }

    return consume(rest, {
      ...acc,
      fileFilters: [...acc.fileFilters, first],
    })
  }

  return consume(argv, {
    fileFilters: [],
    passthroughArgs: [],
    showHelp: false,
  })
}

/**
 * Checks if a file path is the light theme fixture test.
 */
export function isLightFixture(file: string): boolean {
  return file.includes('theme-fixture-light')
}

/**
 * Checks if a file path is the dark theme fixture test.
 */
export function isDarkFixture(file: string): boolean {
  return file.includes('theme-fixture-dark')
}

/**
 * Checks if a file path is a standard end-to-end test.
 */
export function isStandardTest(file: string): boolean {
  return !isLightFixture(file) && !isDarkFixture(file)
}

/**
 * Filters the available test files matching user patterns.
 */
export function filterTestFiles(
  allFiles: readonly string[],
  filters: readonly string[],
): readonly string[] {
  if (filters.length === 0) {
    return allFiles
  }
  const matched = allFiles.filter(file =>
    filters.some(filter =>
      file === filter
      || file.endsWith(`/${filter}`)
      || file.includes(filter),
    ),
  )
  return matched.length > 0 ? matched : filters
}

/**
 * Plans the sequence of test suites to execute.
 */
export function planTestSuites(
  files: readonly string[],
  suiteChoice?: SuiteName | 'all',
): readonly TestSuite[] {
  const standardFiles = files.filter(isStandardTest)
  const lightFiles = files.filter(isLightFixture)
  const darkFiles = files.filter(isDarkFixture)

  const candidateSuites: readonly TestSuite[] = [
    { name: 'standard', theme: undefined, files: standardFiles },
    { name: 'light', theme: 'light', files: lightFiles },
    { name: 'dark', theme: 'dark', files: darkFiles },
  ]

  const activeSuites = candidateSuites.filter(suite => suite.files.length > 0)

  if (suiteChoice === undefined || suiteChoice === 'all') {
    return activeSuites
  }

  return activeSuites.filter(suite => suite.name === suiteChoice)
}

/**
 * Discovers all end-to-end test files in the repository.
 */
export async function findE2eTestFiles(rootDir: string = ROOT_DIR): Promise<readonly string[]> {
  const glob = new Bun.Glob('e2e/*.e2e.ts')
  const matches = await Array.fromAsync(glob.scan({ cwd: rootDir }))
  return [...matches].sort()
}

/**
 * Finds an available ephemeral port for Chrome DevTools Protocol.
 */
export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close((closeErr) => {
        if (closeErr) {
          reject(closeErr)
          return
        }
        if (address !== null && typeof address === 'object') {
          resolve(address.port)
        }
        else {
          reject(new Error('Could not determine free port'))
        }
      })
    })
  })
}

export interface WaitForCdpOptions {
  readonly timeoutMs?: number
  readonly pollIntervalMs?: number
}

/**
 * Waits until the Obsidian Chrome DevTools Protocol endpoint is ready.
 */
export async function waitForCdpReady(
  port: number,
  proc: ChildProcess,
  options?: WaitForCdpOptions,
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_CDP_TIMEOUT_MS
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const startTime = Temporal.Now.instant().epochMilliseconds
  const deadline = startTime + timeoutMs

  const poll = async (): Promise<void> => {
    if (proc.exitCode !== null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain new Error(...); pre-existing false positive, see e2e/fixtures/obsidian.ts.
      throw new Error(`Obsidian process exited early with code ${proc.exitCode}`)
    }
    if (proc.signalCode !== null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain new Error(...); pre-existing false positive, see e2e/fixtures/obsidian.ts.
      throw new Error(`Obsidian process exited early with signal ${proc.signalCode}`)
    }

    const now = Temporal.Now.instant().epochMilliseconds
    if (now >= deadline) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain new Error(...); pre-existing false positive, see e2e/fixtures/obsidian.ts.
      throw new Error(`Timed out waiting for Obsidian CDP endpoint on port ${port} after ${timeoutMs}ms`)
    }

    try {
      const remainingMs = Math.max(10, Math.min(deadline - now, 250))
      const targets = await fetchCdpTargets(port, remainingMs)
      const page = findPageTarget(targets)
      if (page !== undefined) {
        const client = await connectCdp(page.webSocketDebuggerUrl)
        try {
          const isAppReady = await client.evaluate<boolean>(
            'typeof window !== "undefined" && typeof window.app !== "undefined"',
          )
          if (isAppReady === true) {
            return
          }
        }
        finally {
          await client.close()
        }
      }
    }
    catch (fetchErr: unknown) {
      // Retry until port and websocket become ready
      void fetchErr
    }

    await Bun.sleep(pollIntervalMs)
    return poll()
  }

  return poll()
}

/**
 * Stops the Obsidian process and removes temporary directories.
 */
export async function stopObsidian(
  proc: ChildProcess,
  configDir: string,
  vault: string | undefined,
  gracePeriodMs: number = SIGTERM_GRACE_PERIOD_MS,
): Promise<void> {
  const exited = proc.exitCode !== null || proc.signalCode !== null
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
      proc.once('exit', () => resolve())
    })

  if (proc.pid !== undefined) {
    try {
      if (process.platform === 'win32') {
        process.kill(proc.pid, 'SIGTERM')
      }
      else {
        process.kill(-proc.pid, 'SIGTERM')
      }
    }
    catch (killErr: unknown) {
      // Process may already have stopped
      void killErr
    }
  }

  const outcome = await Promise.race<string>([
    exited.then(() => 'exited'),
    Bun.sleep(gracePeriodMs).then(() => 'timed-out'),
  ])

  if (outcome === 'timed-out' && proc.pid !== undefined) {
    process.stderr.write('Obsidian did not exit within the SIGTERM grace period, escalating to SIGKILL\n')
    try {
      if (process.platform === 'win32') {
        process.kill(proc.pid, 'SIGKILL')
      }
      else {
        process.kill(-proc.pid, 'SIGKILL')
      }
    }
    catch (killErr: unknown) {
      // Process may already have stopped
      void killErr
    }
  }

  await exited

  const results = await Promise.allSettled([
    fs.rm(configDir, { recursive: true, force: true }),
    vault !== undefined && vault !== ''
      ? fs.rm(vault, { recursive: true, force: true })
      : Promise.resolve(),
  ])

  results
    .filter(result => result.status === 'rejected')
    .forEach((result) => {
      process.stderr.write(`Obsidian directory cleanup failed: ${String(result.reason)}\n`)
    })
}

/**
 * Registers termination signal handlers for graceful process exit.
 */
export function terminateOnSignal(
  proc: ChildProcess,
  configDir: string,
  vault: string | undefined,
): () => void {
  const onSignal = (signal: NodeJS.Signals): void => {
    void stopObsidian(proc, configDir, vault).finally(() => {
      process.kill(process.pid, signal)
    })
  }

  process.once('SIGTERM', onSignal)
  process.once('SIGINT', onSignal)

  return () => {
    process.removeListener('SIGTERM', onSignal)
    process.removeListener('SIGINT', onSignal)
  }
}

export type LauncherLike = Pick<ObsidianLauncher, 'setupVault' | 'launch'>

export type LaunchSuiteOptions
  = & Readonly<{
    rootDir?: string
    vaultPath?: string
    cacheDir?: string
    appVersion?: string
    installerVersion?: string
    port?: number
  }>
  & Readonly<{
    launcher?: LauncherLike
  }>

export type LaunchedObsidian
  = & Readonly<{
    proc: ChildProcess
    configDir: string
    vault: string | undefined
    port: number
  }>
  & Readonly<{
    removeSignalHandlers: () => void
  }>

/**
 * Launches an Obsidian instance configured for the specified suite.
 */
export async function launchObsidianForSuite(
  suite: TestSuite,
  options?: LaunchSuiteOptions,
): Promise<LaunchedObsidian> {
  const rootDir = options?.rootDir ?? ROOT_DIR
  const vaultPath = options?.vaultPath ?? VAULT_PATH
  const cacheDir = options?.cacheDir ?? CACHE_DIR
  const appVersion = options?.appVersion ?? DEFAULT_OBSIDIAN_APP_VERSION
  const installerVersion = options?.installerVersion ?? DEFAULT_OBSIDIAN_INSTALLER_VERSION
  const port = options?.port ?? await findFreePort()

  const launcher: LauncherLike = options?.launcher ?? new ObsidianLauncher({ cacheDir })

  const copiedVault = await launcher.setupVault({
    vault: vaultPath,
    copy: true,
    plugins: [rootDir],
  })

  if (suite.theme !== undefined) {
    await applyViewMode(copiedVault, suite.theme)
  }

  const { proc, configDir, vault } = await launcher.launch({
    appVersion,
    installerVersion,
    vault: copiedVault,
    copy: false,
    args: [
      `--remote-debugging-port=${port}`,
      '--remote-allow-origins=*',
      '--disable-gpu',
      '--disable-gpu-compositing',
      '--disable-software-rasterizer',
      '--disable-gpu-sandbox',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
    spawnOptions: { stdio: 'pipe', detached: true },
  })

  if (proc.stderr) {
    proc.stderr.on('data', (data: Buffer) => {
      if (process.env.DEBUG_OBSIDIAN) {
        process.stderr.write(`[obsidian] ${data.toString()}`)
      }
    })
  }

  const removeSignalHandlers = terminateOnSignal(proc, configDir, vault)

  return {
    proc,
    configDir,
    vault,
    port,
    removeSignalHandlers,
  }
}

export interface RunBunTestOptions {
  readonly cdpPort: number
  readonly testFiles: readonly string[]
  readonly passthroughArgs?: readonly string[]
  readonly env?: Record<string, string | undefined>
  readonly stdio?: ['inherit' | 'pipe' | 'ignore', 'inherit' | 'pipe' | 'ignore', 'inherit' | 'pipe' | 'ignore']
}

/**
 * Executes Bun test with the targeted test files and Obsidian debugging port.
 */
export async function runBunTest(options: RunBunTestOptions): Promise<number> {
  const args = [
    'bun',
    'test',
    ...(options.passthroughArgs ?? []),
    ...options.testFiles,
  ]
  const env = {
    ...process.env,
    ...(options.env ?? {}),
    OBSIDIAN_CDP_PORT: String(options.cdpPort),
  }
  const proc = Bun.spawn(args, {
    env,
    stdio: options.stdio ?? ['inherit', 'inherit', 'inherit'],
  })
  return proc.exited
}

export type RunSuiteOptions
  = & Readonly<{
    launchOptions?: LaunchSuiteOptions
    passthroughArgs?: readonly string[]
    cdpTimeoutMs?: number
  }>
  & Readonly<{
    runner?: (options: RunBunTestOptions) => Promise<number>
  }>

/**
 * Runs a single test suite with dedicated Obsidian process lifecycle.
 */
export async function runTestSuite(
  suite: TestSuite,
  options?: RunSuiteOptions,
): Promise<number> {
  console.log(`Starting test suite: ${suite.name} (${suite.files.length} test file(s))`)
  const launched = await launchObsidianForSuite(suite, options?.launchOptions)
  try {
    console.log(`Waiting for Obsidian CDP on port ${launched.port}...`)
    await waitForCdpReady(launched.port, launched.proc, {
      timeoutMs: options?.cdpTimeoutMs ?? DEFAULT_CDP_TIMEOUT_MS,
    })
    console.log(`Obsidian is ready on port ${launched.port}`)

    const runner = options?.runner ?? runBunTest
    const exitCode = await runner({
      cdpPort: launched.port,
      testFiles: suite.files,
      passthroughArgs: options?.passthroughArgs,
    })

    if (exitCode === 0) {
      console.log(`Suite ${suite.name} passed`)
    }
    else {
      console.error(`Suite ${suite.name} failed with exit code ${exitCode}`)
    }

    return exitCode
  }
  finally {
    launched.removeSignalHandlers()
    await stopObsidian(launched.proc, launched.configDir, launched.vault)
  }
}

export type OrchestratorOptions
  = & Readonly<{
    allFiles?: readonly string[]
    launchOptions?: LaunchSuiteOptions
    cdpTimeoutMs?: number
  }>
  & Readonly<{
    suiteRunner?: (suite: TestSuite, options?: RunSuiteOptions) => Promise<number>
  }>

function printHelp(): void {
  console.log(`
Usage: bun scripts/run-e2e.ts [options] [files/filters...] [-- passthroughArgs]

Options:
  --suite, -s <name>     Target suite: standard, light, dark, or all
  --theme <light|dark>   Alias to target light or dark suite
  --help, -h             Show this help message

Examples:
  bun scripts/run-e2e.ts
  bun scripts/run-e2e.ts --suite standard
  bun scripts/run-e2e.ts --suite light
  bun scripts/run-e2e.ts e2e/pie-chart-rendering.e2e.ts
  bun scripts/run-e2e.ts --bail e2e/bar-chart-rendering.e2e.ts
`.trim())
}

/**
 * Orchestrates the full end-to-end test run across suites.
 */
export async function runOrchestrator(
  argv: readonly string[],
  options?: OrchestratorOptions,
): Promise<number> {
  const parsed = parseCliArgs(argv)
  if (parsed.showHelp) {
    printHelp()
    return 0
  }

  const allFiles = options?.allFiles ?? await findE2eTestFiles()
  const filteredFiles = filterTestFiles(allFiles, parsed.fileFilters)
  const suites = planTestSuites(filteredFiles, parsed.suite)

  if (suites.length === 0) {
    console.warn('No matching test suites found to run.')
    return 0
  }

  console.log(`Planned suites: ${suites.map(s => s.name).join(', ')}`)

  const suiteRunner = options?.suiteRunner ?? runTestSuite

  const runNext = async (
    remainingSuites: readonly TestSuite[],
    failureCount: number,
  ): Promise<number> => {
    if (remainingSuites.length === 0) {
      return failureCount
    }

    const currentSuite = remainingSuites[0]
    if (currentSuite === undefined) {
      return failureCount
    }

    const exitCode = await suiteRunner(currentSuite, {
      launchOptions: options?.launchOptions,
      passthroughArgs: parsed.passthroughArgs,
      cdpTimeoutMs: options?.cdpTimeoutMs,
    })

    const newFailureCount = exitCode === 0 ? failureCount : failureCount + 1

    const shouldBail = parsed.passthroughArgs.includes('--bail') || parsed.passthroughArgs.includes('-b')
    if (shouldBail && exitCode !== 0) {
      console.error(`Bailing after failure in suite: ${currentSuite.name}`)
      return newFailureCount
    }

    return runNext(remainingSuites.slice(1), newFailureCount)
  }

  const totalFailures = await runNext(suites, 0)
  if (totalFailures > 0) {
    console.error(`E2E test run failed: ${totalFailures} suite(s) had errors.`)
    return 1
  }

  console.log('All E2E test suites passed successfully.')
  return 0
}

async function main(): Promise<void> {
  const exitCode = await runOrchestrator(process.argv.slice(2))
  process.exit(exitCode)
}

if (import.meta.main) {
  main().catch((err: unknown) => {
    console.error('Fatal error in run-e2e:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}
