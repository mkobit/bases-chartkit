/**
 * Bun test fixture bridge for Obsidian end-to-end tests.
 * Connects to the orchestrator-managed Chrome DevTools Protocol port.
 * Preserves Playwright test runner fallback for legacy Node execution until Phase 4.
 */

import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import type { App } from 'obsidian'
import type { Page as PlaywrightPage } from '@playwright/test'
import type { ChildProcess } from 'node:child_process'
import { connectCdp } from '../cdp/client'
import type { CdpClient, ScreenshotOptions } from '../cdp/client'

const isBun = typeof Bun !== 'undefined'

const bunTest = isBun ? await import('bun:test') : null
const pollModule = isBun ? await import('../helpers/poll') : null
const augmentedExpect = pollModule ? pollModule.expect : null
const playwright = !isBun ? await import('@playwright/test') : null
const obsidianLauncherModule = !isBun ? await import('obsidian-launcher') : null
const net = !isBun ? await import('node:net') : null
const appearanceModule = !isBun ? await import('../../shared/appearance') : null
const evaluateModule = !isBun ? await import('../helpers/evaluate') : null

export const ROOT_DIR = path.resolve(import.meta.dirname, '../../')
export const VAULT_PATH = path.join(ROOT_DIR, 'bases-chartkit-example-vault')
export const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')
export const OBSIDIAN_APP_VERSION = '1.13.4'
export const OBSIDIAN_INSTALLER_VERSION = '1.13.4'

const LOCATOR_BRAND = Symbol('ObsidianLocator')

export interface Locator {
  readonly [LOCATOR_BRAND]: true
  readonly count: () => Promise<number>
  readonly click: (options?: { readonly timeout?: number }) => Promise<void>
  readonly first: () => Locator
  readonly isVisible: (options?: { readonly timeout?: number }) => Promise<boolean>
}

export interface Mouse {
  readonly move: (x: number, y: number, options?: { readonly steps?: number }) => Promise<void>
  readonly down: (options?: { readonly button?: 'left' | 'middle' | 'right' }) => Promise<void>
  readonly up: (options?: { readonly button?: 'left' | 'middle' | 'right' }) => Promise<void>
  readonly click: (x: number, y: number, options?: { readonly button?: 'left' | 'middle' | 'right' }) => Promise<void>
}

export interface Keyboard {
  readonly press: (key: string) => Promise<void>
}

export interface ObsidianPageObject {
  readonly evaluate: <T = unknown, A = unknown>(
    fn: ((args: A) => T | Promise<T>) | string,
    args?: A,
  ) => Promise<T>
  readonly mouse: Mouse
  readonly keyboard: Keyboard
  readonly locator: (selector: string, options?: { readonly hasText?: string }) => Locator
  readonly screenshot: (options?: ScreenshotOptions) => Promise<Buffer>
  readonly waitForFunction: (
    fn: (() => boolean | Promise<boolean>) | string,
    options?: { readonly timeout?: number },
  ) => Promise<void>
}

export type Page = ObsidianPageObject

export interface ObsidianPage {
  readonly page: ObsidianPageObject & PlaywrightPage
}

export interface ObsidianTestFixtures {
  readonly obsidianPage: ObsidianPage
}

export type ObsidianTestFunction = (
  fixtures: ObsidianTestFixtures,
) => void | Promise<void>

export type TestCallback = ObsidianTestFunction | (() => void | Promise<void>)

export function isLocator(value: unknown): value is Locator {
  return typeof value === 'object' && value !== null && LOCATOR_BRAND in value
}

function fail(message: string): never {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- standard Error instance
  throw new Error(message)
}

/**
 * Reads and validates the Chrome DevTools Protocol port from environment variables.
 */
export function getCdpPort(env: NodeJS.ProcessEnv = process.env): number {
  const rawPort = env.OBSIDIAN_CDP_PORT
  if (rawPort === undefined || rawPort.trim() === '') {
    fail('OBSIDIAN_CDP_PORT environment variable is missing')
  }
  const port = Number(rawPort)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    fail(`OBSIDIAN_CDP_PORT environment variable is invalid: "${rawPort}"`)
  }
  return port
}

let activeCdpClient: CdpClient | null = null
let activeCdpClientPromise: Promise<CdpClient> | null = null
let activePage: (ObsidianPageObject & PlaywrightPage) | null = null

/**
 * Connects to or reuses the active Chrome DevTools Protocol client connection.
 */
export async function getActiveCdpClient(): Promise<CdpClient> {
  if (activeCdpClient !== null) {
    return activeCdpClient
  }
  if (activeCdpClientPromise !== null) {
    return activeCdpClientPromise
  }
  const port = getCdpPort()
  activeCdpClientPromise = connectCdp(port)
    .then((client) => {
      activeCdpClient = client
      activeCdpClientPromise = null
      return client
    })
    .catch((err) => {
      activeCdpClientPromise = null
      throw err
    })
  return activeCdpClientPromise
}

export function setCdpClientForTesting(client: CdpClient | null): void {
  activeCdpClient = client
  activeCdpClientPromise = null
  activePage = null
}

export async function closeActiveCdpConnection(): Promise<void> {
  if (activeCdpClient !== null) {
    const client = activeCdpClient
    activeCdpClient = null
    activeCdpClientPromise = null
    activePage = null
    await client.close()
  }
}

export function sanitizeTestTitle(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned === '' ? 'test' : cleaned
}

const DEFAULT_MOUSE_MOVE_STEPS = 1

export function createObsidianPage(client: CdpClient): ObsidianPageObject & PlaywrightPage {
  let currentMouseX = 0
  let currentMouseY = 0

  const evaluate = async <T = unknown, A = unknown>(
    fn: ((args: A) => T | Promise<T>) | string,
    args?: A,
  ): Promise<T> => {
    if (typeof fn === 'string') {
      return client.evaluate<T>(fn)
    }
    const fnSrc = fn.toString()
    const serializedArgs = args === undefined ? 'undefined' : JSON.stringify(args)
    const expression = `Promise.resolve().then(() => (${fnSrc})(${serializedArgs}))`
    return client.evaluate<T>(expression)
  }

  const mouse: Mouse = {
    move: async (x: number, y: number, options?: { readonly steps?: number }): Promise<void> => {
      const steps = Math.max(1, options?.steps ?? DEFAULT_MOUSE_MOVE_STEPS)
      const startX = currentMouseX
      const startY = currentMouseY

      for (let i = 1; i <= steps; i += 1) {
        const fraction = i / steps
        const intermediateX = startX + (x - startX) * fraction
        const intermediateY = startY + (y - startY) * fraction
        await client.dispatchMouseEvent({
          type: 'mouseMoved',
          x: intermediateX,
          y: intermediateY,
        })
      }

      currentMouseX = x
      currentMouseY = y
    },

    down: async (options?: { readonly button?: 'left' | 'middle' | 'right' }): Promise<void> => {
      await client.dispatchMouseEvent({
        type: 'mousePressed',
        x: currentMouseX,
        y: currentMouseY,
        button: options?.button ?? 'left',
        clickCount: 1,
      })
    },

    up: async (options?: { readonly button?: 'left' | 'middle' | 'right' }): Promise<void> => {
      await client.dispatchMouseEvent({
        type: 'mouseReleased',
        x: currentMouseX,
        y: currentMouseY,
        button: options?.button ?? 'left',
        clickCount: 1,
      })
    },

    click: async (x: number, y: number, options?: { readonly button?: 'left' | 'middle' | 'right' }): Promise<void> => {
      await mouse.move(x, y)
      await mouse.down(options)
      await mouse.up(options)
    },
  }

  const KEY_MAPPINGS: Record<string, { readonly key: string, readonly code: string, readonly keyCode: number }> = {
    Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
    Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
    Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
    Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
    ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
    ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
    ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
    ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  }

  const keyboard: Keyboard = {
    press: async (key: string): Promise<void> => {
      const mapping = KEY_MAPPINGS[key]
      const keyName = mapping?.key ?? key
      const codeName = mapping?.code ?? key
      const keyCode = mapping?.keyCode ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0)

      await client.dispatchKeyEvent({
        type: 'rawKeyDown',
        key: keyName,
        code: codeName,
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
      })
      await client.dispatchKeyEvent({
        type: 'keyUp',
        key: keyName,
        code: codeName,
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
      })
    },
  }

  const createLocatorInstance = (
    selector: string,
    options?: { readonly hasText?: string, readonly index?: number },
  ): Locator => {
    const hasText = options?.hasText
    const targetIndex = options?.index

    const count = async (): Promise<number> => {
      const elementsCount = await evaluate<number, { readonly selector: string, readonly hasText?: string }>(
        (args) => {
          const list = Array.from(document.querySelectorAll(args.selector))
          const filtered = args.hasText !== undefined
            ? list.filter(el => (el.textContent ?? '').includes(args.hasText ?? ''))
            : list
          return filtered.length
        },
        { selector, hasText },
      )
      return targetIndex !== undefined ? Math.min(1, Math.max(0, elementsCount - targetIndex)) : elementsCount
    }

    const click = async (clickOptions?: { readonly timeout?: number }): Promise<void> => {
      const timeoutMs = clickOptions?.timeout ?? 5_000
      const startTime = Temporal.Now.instant().epochMilliseconds
      const deadline = startTime + timeoutMs

      const pollForElement = async (): Promise<{ readonly x: number, readonly y: number }> => {
        const coords = await evaluate<
          { readonly x: number, readonly y: number } | null,
          { readonly selector: string, readonly hasText?: string, readonly index: number }
        >(
          (args) => {
            const list = Array.from(document.querySelectorAll(args.selector))
            const filtered = args.hasText !== undefined
              ? list.filter(el => (el.textContent ?? '').includes(args.hasText ?? ''))
              : list
            const el = filtered[args.index]
            if (!el) {
              return null
            }
            const rect = el.getBoundingClientRect()
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            }
          },
          { selector, hasText, index: targetIndex ?? 0 },
        )

        if (coords !== null) {
          return coords
        }

        const now = Temporal.Now.instant().epochMilliseconds
        if (now >= deadline) {
          fail(`Element not found or not clickable for selector "${selector}" after ${timeoutMs}ms`)
        }
        await Bun.sleep(100)
        return pollForElement()
      }

      const point = await pollForElement()
      await mouse.click(point.x, point.y)
    }

    const first = (): Locator => createLocatorInstance(selector, { hasText, index: 0 })

    const isVisible = async (visOptions?: { readonly timeout?: number }): Promise<boolean> => {
      const timeoutMs = visOptions?.timeout ?? 5_000
      const startTime = Temporal.Now.instant().epochMilliseconds
      const deadline = startTime + timeoutMs

      const checkVisibility = async (): Promise<boolean> => {
        const visible = await evaluate<
          boolean,
          { readonly selector: string, readonly hasText?: string, readonly index: number }
        >(
          (args) => {
            const list = Array.from(document.querySelectorAll(args.selector))
            const filtered = args.hasText !== undefined
              ? list.filter(el => (el.textContent ?? '').includes(args.hasText ?? ''))
              : list
            const el = filtered[args.index]
            if (!el) {
              return false
            }
            const rect = el.getBoundingClientRect()
            const style = window.getComputedStyle(el)
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
          },
          { selector, hasText, index: targetIndex ?? 0 },
        )

        if (visible) {
          return true
        }

        const now = Temporal.Now.instant().epochMilliseconds
        if (now >= deadline) {
          return false
        }
        await Bun.sleep(100)
        return checkVisibility()
      }

      return checkVisibility()
    }

    return {
      [LOCATOR_BRAND]: true,
      count,
      click,
      first,
      isVisible,
    }
  }

  const locator = (
    selector: string,
    options?: { readonly hasText?: string },
  ): Locator => createLocatorInstance(selector, options)

  const screenshot = async (options?: ScreenshotOptions): Promise<Buffer> =>
    client.captureScreenshot(options)

  const waitForFunction = async (
    fn: (() => boolean | Promise<boolean>) | string,
    options?: { readonly timeout?: number },
  ): Promise<void> => {
    const timeoutMs = options?.timeout ?? 30_000
    const startTime = Temporal.Now.instant().epochMilliseconds
    const deadline = startTime + timeoutMs

    const poll = async (): Promise<void> => {
      const passed = await evaluate<boolean>(fn)
      if (passed) {
        return
      }
      const now = Temporal.Now.instant().epochMilliseconds
      if (now >= deadline) {
        fail(`waitForFunction timed out after ${timeoutMs}ms`)
      }
      await Bun.sleep(100)
      return poll()
    }

    return poll()
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- bridge custom page object to PlaywrightPage compatibility type
  return {
    evaluate,
    mouse,
    keyboard,
    locator,
    screenshot,
    waitForFunction,
  } as unknown as ObsidianPageObject & PlaywrightPage
}

export async function getOrCreateObsidianPage(): Promise<ObsidianPageObject & PlaywrightPage> {
  if (activePage !== null) {
    return activePage
  }
  const client = await getActiveCdpClient()
  activePage = createObsidianPage(client)
  return activePage
}

export async function resetWorkspace(page: ObsidianPageObject): Promise<void> {
  await page.evaluate(() => {
    const win = window
    const obsidianApp = (win.activeWindow || win).app
    if (obsidianApp?.workspace !== undefined) {
      obsidianApp.workspace.detachLeavesOfType('bases')
    }
    const modals = document.querySelectorAll('.bases-chart-modal, .modal-container')
    modals.forEach((modal) => {
      const closeButton = modal.querySelector('.modal-close-button')
      if (closeButton instanceof HTMLElement) {
        closeButton.click()
      }
      else {
        modal.remove()
      }
    })
  })
}

export async function captureFailureScreenshot(
  page: ObsidianPageObject,
  testName: string,
  outputDir = path.join(ROOT_DIR, 'test-results'),
): Promise<string> {
  const sanitized = sanitizeTestTitle(testName)
  const filename = `${sanitized}-failure.png`
  const filepath = path.join(outputDir, filename)

  try {
    await fs.mkdir(outputDir, { recursive: true })
    const buffer = await page.screenshot({ format: 'png' })
    await fs.writeFile(filepath, buffer)
    process.stderr.write(`[test failure] Screenshot saved to: ${filepath}\n`)
    return filepath
  }
  catch (screenshotErr: unknown) {
    process.stderr.write(`[test failure] Failed to capture failure screenshot: ${String(screenshotErr)}\n`)
    return filepath
  }
}

if (augmentedExpect) {
  augmentedExpect.extend({
  async toHaveCount(received: unknown, expected: number) {
    const isNegated = this.isNot === true
    if (!isLocator(received)) {
      return {
        pass: false,
        message: () => `expected Locator instance, received ${typeof received}`,
      }
    }
    const actualCount = await received.count()
    const pass = actualCount === expected
    return {
      pass,
      message: () =>
        isNegated
          ? `expected locator count not to be ${expected}`
          : `expected locator count to be ${expected}, got ${actualCount}`,
    }
  },

  async toBeVisible(received: unknown, options?: { readonly timeout?: number }) {
    const isNegated = this.isNot === true
    if (!isLocator(received)) {
      return {
        pass: false,
        message: () => `expected Locator instance, received ${typeof received}`,
      }
    }
    const timeoutMs = options?.timeout ?? 5_000
    const startTime = Temporal.Now.instant().epochMilliseconds
    const deadline = startTime + timeoutMs

    const pollVis = async (): Promise<boolean> => {
      const visible = await received.isVisible()
      if (isNegated ? !visible : visible) {
        return visible
      }
      const now = Temporal.Now.instant().epochMilliseconds
      if (now >= deadline) {
        return visible
      }
      await Bun.sleep(Math.min(100, Math.max(0, deadline - now)))
      return pollVis()
    }

    const isVis = await pollVis()
    return {
      pass: isVis,
      message: () =>
        isNegated
          ? 'expected locator not to be visible'
          : `expected locator to be visible (timed out after ${timeoutMs}ms)`,
    }
  },
})
}

export async function evaluateObsidian<T>(
  fn: (app: App) => T | Promise<T>,
): Promise<T>
export async function evaluateObsidian<T, A>(
  fn: (app: App, args: A) => T | Promise<T>,
  args: A,
): Promise<T>
export async function evaluateObsidian<T>(
  page: ObsidianPageObject,
  fn: (app: App) => T | Promise<T>,
): Promise<T>
export async function evaluateObsidian<T, A>(
  page: ObsidianPageObject,
  fn: (app: App, args: A) => T | Promise<T>,
  args: A,
): Promise<T>
export async function evaluateObsidian<T, A>(
  pageOrFn: ObsidianPageObject | ((app: App) => T | Promise<T>) | ((app: App, args: A) => T | Promise<T>),
  fnOrArgs?: ((app: App) => T | Promise<T>) | ((app: App, args: A) => T | Promise<T>) | A,
  maybeArgs?: A,
): Promise<T> {
  if (typeof pageOrFn === 'function') {
    const page = await getOrCreateObsidianPage()
    const fnSrc = pageOrFn.toString()
    const serializedArgs = fnOrArgs === undefined ? 'undefined' : JSON.stringify(fnOrArgs)
    const expression = `(() => {
      const fnObj = new Function('return (' + ${JSON.stringify(fnSrc)} + ')')();
      const win = window;
      const obsidianApp = (win.activeWindow || win).app;
      return fnObj(obsidianApp, ${serializedArgs});
    })()`
    return page.evaluate<T, undefined>(expression)
  }

  if (typeof fnOrArgs === 'function') {
    const fnSrc = fnOrArgs.toString()
    const serializedArgs = maybeArgs === undefined ? 'undefined' : JSON.stringify(maybeArgs)
    const expression = `(() => {
      const fnObj = new Function('return (' + ${JSON.stringify(fnSrc)} + ')')();
      const win = window;
      const obsidianApp = (win.activeWindow || win).app;
      return fnObj(obsidianApp, ${serializedArgs});
    })()`
    return pageOrFn.evaluate<T, undefined>(expression)
  }

  fail('Invalid evaluateObsidian arguments')
}

function wrapTestCallback(
  name: string,
  fn: TestCallback,
): () => Promise<void> {
  return async () => {
    const page = await getOrCreateObsidianPage()
    await resetWorkspace(page)
    try {
      const outcome = fn({ obsidianPage: { page } })
      if (outcome instanceof Promise) {
        await outcome
      }
    }
    catch (error: unknown) {
      await captureFailureScreenshot(page, name)
      throw error
    }
  }
}

function createTestWrapper(
  baseRunner: unknown,
) {
  return (
    name: string,
    fn?: TestCallback,
    options?: number | Record<string, unknown>,
  ) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- delegate runner callback
    const runner = baseRunner as (testName: string, testFn: () => void | Promise<void>, testOptions?: unknown) => void
    if (fn === undefined) {
      return runner(name, () => {})
    }
    return runner(name, wrapTestCallback(name, fn), options)
  }
}

export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!net) {
      fail('node:net is unavailable')
    }
    const server = net.createServer()
    server.listen(0, () => {
      const addr = server.address()
      server.close(() => {
        if (addr !== null && typeof addr === 'object') {
          resolve(addr.port)
        }
        else {
          fail('Could not determine free port')
        }
      })
    })
  })
}

export async function waitForCDP(port: number, proc: ChildProcess): Promise<void> {
  if (!playwright) {
    return
  }
  await playwright.expect(async () => {
    if (proc.exitCode !== null) {
      fail(`Obsidian process exited early with code ${proc.exitCode}`)
    }
    const browser = await playwright.chromium.connectOverCDP(`http://localhost:${port}`, { timeout: 30_000 })
    await browser.close()
  }).toPass({ intervals: [1_000], timeout: 30_000 })
}

const SIGTERM_GRACE_PERIOD_MS = 5_000

export async function stopObsidian(proc: ChildProcess, configDir: string, vault: string | undefined): Promise<void> {
  const exited = proc.exitCode !== null || proc.signalCode !== null
    ? Promise.resolve()
    : new Promise<void>((resolve) => { proc.once('exit', () => resolve()) })

  if (proc.pid !== undefined) {
    process.kill(-proc.pid, 'SIGTERM')
  }

  const outcome = await Promise.race([
    exited.then(() => 'exited' as const),
    new Promise<'timed-out'>((resolve) => {
      setTimeout(() => resolve('timed-out'), SIGTERM_GRACE_PERIOD_MS)
    }),
  ])

  if (outcome === 'timed-out' && proc.pid !== undefined) {
    process.stderr.write('obsidian did not exit within the SIGTERM grace period, escalating to SIGKILL\n')
    process.kill(-proc.pid, 'SIGKILL')
  }

  await exited

  const results = await Promise.allSettled([
    fs.rm(configDir, { recursive: true, force: true }),
    vault ? fs.rm(vault, { recursive: true, force: true }) : Promise.resolve(),
  ])
  for (const result of results) {
    if (result.status === 'rejected') {
      process.stderr.write(`obsidian tmpdir cleanup failed: ${String(result.reason)}\n`)
    }
  }
}

function terminateOnSignal(proc: ChildProcess, configDir: string, vault: string | undefined): () => void {
  const onSignal = (signal: NodeJS.Signals): void => {
    void stopObsidian(proc, configDir, vault).finally(() => process.kill(process.pid, signal))
  }
  process.once('SIGTERM', onSignal)
  process.once('SIGINT', onSignal)
  return () => {
    process.removeListener('SIGTERM', onSignal)
    process.removeListener('SIGINT', onSignal)
  }
}

type ObsidianWorkerOptions = {
  readonly theme: import('../../shared/appearance').ViewMode | undefined
}

type ObsidianWorkerFixtures = ObsidianWorkerOptions & {
  readonly obsidianPage: ObsidianPage
}

type LegacyTestFixtures = {
  readonly resetWorkspace: void
}

const playwrightTestInstance = playwright && obsidianLauncherModule && appearanceModule && evaluateModule
  ? playwright.test.extend<LegacyTestFixtures, ObsidianWorkerFixtures>({
      theme: [undefined, { option: true, scope: 'worker' }],
      obsidianPage: [async ({ theme }, use) => {
        const port = await findFreePort()
        const ObsidianLauncher = obsidianLauncherModule.default
        const launcher = new ObsidianLauncher({ cacheDir: CACHE_DIR })

        const copiedVault = await launcher.setupVault({
          vault: VAULT_PATH,
          copy: true,
          plugins: [ROOT_DIR],
        })
        if (theme) {
          await appearanceModule.applyViewMode(copiedVault, theme)
        }

        const { proc, configDir, vault } = await launcher.launch({
          appVersion: OBSIDIAN_APP_VERSION,
          installerVersion: OBSIDIAN_INSTALLER_VERSION,
          vault: copiedVault,
          copy: false,
          args: [
            `--remote-debugging-port=${port}`,
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
          proc.stderr.on('data', (data: Buffer) => process.stderr.write(`[obsidian] ${data.toString()}`))
        }

        const removeSignalHandlers = terminateOnSignal(proc, configDir, vault)

        try {
          await waitForCDP(port, proc)

          const browser = await playwright.chromium.connectOverCDP(`http://localhost:${port}`)
          const context = browser.contexts()[0] ?? await browser.newContext()
          const page = context.pages()[0] ?? await context.newPage()

          await page.waitForFunction(
            () => typeof (window as { app?: unknown }).app !== 'undefined',
            { timeout: 30_000 },
          )

          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- bridge playwright page
          await use({ page: page as unknown as ObsidianPageObject & PlaywrightPage })

          await browser.close()
        }
        finally {
          removeSignalHandlers()
          await stopObsidian(proc, configDir, vault)
        }
      }, { scope: 'worker' }],

      resetWorkspace: [async ({ obsidianPage: { page } }, use) => {
        await evaluateModule.evaluateObsidian(page, (app) => {
          app.workspace.detachLeavesOfType('bases')
        })
        await use()
      }, { auto: true }],
    })
  : null

const bunTestBridge = bunTest
  ? Object.assign(createTestWrapper(bunTest.test), {
      describe: bunTest.describe,
      skip: createTestWrapper(bunTest.test.skip),
      only: (
        name: string,
        fn?: TestCallback,
        options?: number | Record<string, unknown>,
      ) => createTestWrapper(bunTest.test.only)(name, fn, options),
      fixme: createTestWrapper(bunTest.test.skip),
      use: (_options?: { readonly theme?: 'dark' | 'light' }): void => {},
      beforeEach: bunTest.beforeEach,
      afterEach: bunTest.afterEach,
      beforeAll: bunTest.beforeAll,
      afterAll: bunTest.afterAll,
    })
  : null

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- bridge test runner instance
export const test = (isBun ? bunTestBridge : playwrightTestInstance) as unknown as typeof playwrightTestInstance

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- bridge expect instance
export const expect = (isBun ? augmentedExpect : playwright?.expect) as unknown as typeof augmentedExpect

if (isBun && bunTest) {
  bunTest.afterAll(async () => {
    await closeActiveCdpConnection()
  })
}
