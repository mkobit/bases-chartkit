/**
 * Bun test fixture bridge for Obsidian end-to-end tests.
 * Connects to the orchestrator-managed Chrome DevTools Protocol port.
 */

import { test as bunTest, describe, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import type { App } from 'obsidian'
import type { Page as PlaywrightPage } from '@playwright/test'
import { connectCdp } from '../cdp/client'
import type { CdpClient, ScreenshotOptions } from '../cdp/client'
import { expect as augmentedExpect } from '../helpers/poll'

export const ROOT_DIR = path.resolve(import.meta.dirname, '../../')
export const VAULT_PATH = path.join(ROOT_DIR, 'bases-chartkit-example-vault')

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
export async function getOrCreateCdpClient(): Promise<CdpClient> {
  if (activeCdpClient !== null) {
    return activeCdpClient
  }
  if (activeCdpClientPromise !== null) {
    return activeCdpClientPromise
  }
  const port = getCdpPort()
  activeCdpClientPromise = (async () => {
    const client = await connectCdp(port)
    activeCdpClient = client
    return client
  })()
  try {
    return await activeCdpClientPromise
  }
  catch (error: unknown) {
    activeCdpClientPromise = null
    throw error
  }
}

/**
 * Closes the active Chrome DevTools Protocol WebSocket connection.
 */
export async function closeActiveCdpConnection(): Promise<void> {
  if (activeCdpClient !== null) {
    const client = activeCdpClient
    activeCdpClient = null
    activeCdpClientPromise = null
    activePage = null
    await client.close()
  }
}

/**
 * Injects a mock or custom CDP client for testing purposes.
 */
export function setCdpClientForTesting(client: CdpClient | null): void {
  activeCdpClient = client
  activeCdpClientPromise = client !== null ? Promise.resolve(client) : null
  activePage = client !== null ? createObsidianPage(client) : null
}

const KEY_DEFINITIONS: Readonly<Record<string, { readonly key: string, readonly code: string, readonly keyCode: number }>> = {
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
  Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
}

function createLocator(
  page: ObsidianPageObject,
  selector: string,
  options?: { readonly hasText?: string },
  isFirstOnly: boolean = false,
): Locator {
  return {
    [LOCATOR_BRAND]: true,
    first: () => createLocator(page, selector, options, true),
    count: async (): Promise<number> => {
      return page.evaluate(([sel, opt, first]) => {
        const elements = Array.from(document.querySelectorAll(sel))
        const textFilter = opt?.hasText
        const filtered = textFilter !== undefined
          ? elements.filter(el => (el.textContent ?? '').includes(textFilter))
          : elements
        return first ? Math.min(filtered.length, 1) : filtered.length
      }, [selector, options, isFirstOnly] as const)
    },
    click: async (clickOptions?: { readonly timeout?: number }): Promise<void> => {
      const timeoutMs = clickOptions?.timeout ?? 5_000
      const deadline = Temporal.Now.instant().epochMilliseconds + timeoutMs

      const pollClick = async (): Promise<void> => {
        const clicked = await page.evaluate(([sel, opt, first]) => {
          const elements = Array.from(document.querySelectorAll(sel))
          const textFilter = opt?.hasText
          const filtered = textFilter !== undefined
            ? elements.filter(el => (el.textContent ?? '').includes(textFilter))
            : elements
          const target = first ? filtered[0] : filtered[0]
          if (!target) {
            return false
          }
          if ('click' in target && typeof target.click === 'function') {
            if ('scrollIntoView' in target && typeof target.scrollIntoView === 'function') {
              target.scrollIntoView({ block: 'center', inline: 'center' })
            }
            target.click()
          }
          else {
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
          }
          return true
        }, [selector, options, isFirstOnly] as const)

        if (clicked) {
          return
        }

        const now = Temporal.Now.instant().epochMilliseconds
        if (now >= deadline) {
          fail(`Element not found to click for selector: "${selector}" after ${timeoutMs}ms`)
        }
        await Bun.sleep(100)
        return pollClick()
      }

      return pollClick()
    },
    isVisible: async (visOptions?: { readonly timeout?: number }): Promise<boolean> => {
      const timeoutMs = visOptions?.timeout ?? 0
      const checkVisible = async (): Promise<boolean> => {
        return page.evaluate(([sel, opt, first]) => {
          const elements = Array.from(document.querySelectorAll(sel))
          const textFilter = opt?.hasText
          const filtered = textFilter !== undefined
            ? elements.filter(el => (el.textContent ?? '').includes(textFilter))
            : elements
          const targetList = first ? filtered.slice(0, 1) : filtered
          if (targetList.length === 0) {
            return false
          }
          return targetList.some((element) => {
            if (!('getBoundingClientRect' in element && typeof element.getBoundingClientRect === 'function')) {
              return true
            }
            const style = window.getComputedStyle(element)
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              return false
            }
            const rect = element.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0
          })
        }, [selector, options, isFirstOnly] as const)
      }

      if (timeoutMs <= 0) {
        return checkVisible()
      }

      const deadline = Temporal.Now.instant().epochMilliseconds + timeoutMs
      const pollVisibility = async (): Promise<boolean> => {
        const visible = await checkVisible()
        if (visible) {
          return true
        }
        const now = Temporal.Now.instant().epochMilliseconds
        if (now >= deadline) {
          return false
        }
        await Bun.sleep(Math.min(100, Math.max(0, deadline - now)))
        return pollVisibility()
      }
      return pollVisibility()
    },
  }
}

/**
 * Creates an Obsidian page object wrapper around a Chrome DevTools Protocol client.
 */
export function createObsidianPage(client: CdpClient): ObsidianPageObject & PlaywrightPage {
  let currentX = 0
  let currentY = 0

  const mouse: Mouse = {
    move: async (x: number, y: number, options?: { readonly steps?: number }): Promise<void> => {
      const steps = Math.max(1, options?.steps ?? 1)
      if (steps === 1) {
        await client.dispatchMouseEvent({ type: 'mouseMoved', x, y })
        currentX = x
        currentY = y
        return
      }

      const startX = currentX
      const startY = currentY
      const stepIndices = Array.from({ length: steps }, (_, index) => index + 1)
      for (const step of stepIndices) {
        const progress = step / steps
        const interX = startX + (x - startX) * progress
        const interY = startY + (y - startY) * progress
        await client.dispatchMouseEvent({
          type: 'mouseMoved',
          x: interX,
          y: interY,
        })
      }
      currentX = x
      currentY = y
    },
    down: async (options?: { readonly button?: 'left' | 'middle' | 'right' }): Promise<void> => {
      await client.dispatchMouseEvent({
        type: 'mousePressed',
        x: currentX,
        y: currentY,
        button: options?.button ?? 'left',
        clickCount: 1,
      })
    },
    up: async (options?: { readonly button?: 'left' | 'middle' | 'right' }): Promise<void> => {
      await client.dispatchMouseEvent({
        type: 'mouseReleased',
        x: currentX,
        y: currentY,
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

  const keyboard: Keyboard = {
    press: async (key: string): Promise<void> => {
      const mapped = KEY_DEFINITIONS[key]
      if (mapped !== undefined) {
        await client.dispatchKeyEvent({
          type: 'rawKeyDown',
          key: mapped.key,
          code: mapped.code,
          windowsVirtualKeyCode: mapped.keyCode,
        })
        await client.dispatchKeyEvent({
          type: 'keyUp',
          key: mapped.key,
          code: mapped.code,
          windowsVirtualKeyCode: mapped.keyCode,
        })
        return
      }

      if (key.length === 1) {
        await client.dispatchKeyEvent({
          type: 'rawKeyDown',
          key,
          text: key,
          unmodifiedText: key,
        })
        await client.dispatchKeyEvent({
          type: 'keyUp',
          key,
        })
        return
      }

      await client.dispatchKeyEvent({ type: 'rawKeyDown', key })
      await client.dispatchKeyEvent({ type: 'keyUp', key })
    },
  }

  const pageObject: ObsidianPageObject = {
    evaluate: async <T = unknown, A = unknown>(
      fn: ((args: A) => T | Promise<T>) | string,
      args?: A,
    ): Promise<T> => {
      if (typeof fn === 'string') {
        if (args !== undefined) {
          const serializedArgs = JSON.stringify(args)
          const expression = `(() => {
            const args = ${serializedArgs};
            return (${fn});
          })()`
          return client.evaluate<T>(expression)
        }
        return client.evaluate<T>(fn)
      }

      const fnSrc = fn.toString()
      const serializedArgs = args === undefined ? 'undefined' : JSON.stringify(args)
      const expression = `(() => {
        const userFn = (${fnSrc});
        return userFn(${serializedArgs});
      })()`
      return client.evaluate<T>(expression)
    },
    mouse,
    keyboard,
    locator: (selector: string, options?: { readonly hasText?: string }) => {
      return createLocator(pageObject, selector, options)
    },
    screenshot: async (options?: ScreenshotOptions): Promise<Buffer> => {
      return client.captureScreenshot(options)
    },
    waitForFunction: async (
      fn: (() => boolean | Promise<boolean>) | string,
      options?: { readonly timeout?: number },
    ): Promise<void> => {
      const timeoutMs = options?.timeout ?? 30_000
      const deadline = Temporal.Now.instant().epochMilliseconds + timeoutMs

      const pollFn = async (): Promise<void> => {
        const result = await pageObject.evaluate(fn)
        if (result) {
          return
        }
        const now = Temporal.Now.instant().epochMilliseconds
        if (now >= deadline) {
          fail(`waitForFunction timed out after ${timeoutMs}ms`)
        }
        await Bun.sleep(Math.min(100, Math.max(0, deadline - now)))
        return pollFn()
      }

      return pollFn()
    },
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- bridge page object to Playwright page interface during migration
  return pageObject as ObsidianPageObject & PlaywrightPage
}

/**
 * Retrieves or initializes the singleton Obsidian page instance.
 */
export async function getOrCreateObsidianPage(): Promise<ObsidianPageObject & PlaywrightPage> {
  if (activePage !== null) {
    return activePage
  }
  const client = await getOrCreateCdpClient()
  activePage = createObsidianPage(client)
  return activePage
}

/**
 * Resets the Obsidian workspace state before executing a test.
 */
export async function resetWorkspace(page: ObsidianPageObject): Promise<void> {
  await page.evaluate(`(() => {
    const win = window;
    const obsidianApp = (win.activeWindow || win).app;
    if (obsidianApp && obsidianApp.workspace && typeof obsidianApp.workspace.detachLeavesOfType === 'function') {
      obsidianApp.workspace.detachLeavesOfType('bases');
    }

    const modalContainers = Array.from(document.querySelectorAll('.modal-container'));
    modalContainers.forEach((container) => {
      const closeButton = container.querySelector('.modal-close-button');
      if (closeButton && typeof closeButton.click === 'function') {
        closeButton.click();
      }
      else {
        container.remove();
      }
    });

    const chartModals = Array.from(document.querySelectorAll('.bases-chart-modal, .modal-bg'));
    chartModals.forEach((element) => {
      element.remove();
    });
  })()`)
}

/**
 * Sanitizes a test title for safe filesystem screenshot naming.
 */
export function sanitizeTestTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Captures a screenshot to the test-results directory upon test failure.
 */
export async function captureFailureScreenshot(
  page: ObsidianPageObject,
  testTitle: string,
): Promise<void> {
  try {
    const sanitizedTitle = sanitizeTestTitle(testTitle)
    const resultsDir = path.resolve(process.cwd(), 'test-results')
    await fs.mkdir(resultsDir, { recursive: true })
    const screenshotPath = path.join(resultsDir, `${sanitizedTitle}-failure.png`)
    const screenshotBuffer = await page.screenshot({ format: 'png' })
    await fs.writeFile(screenshotPath, screenshotBuffer)
    process.stderr.write(`[test failure] Screenshot saved to: ${screenshotPath}\n`)
  }
  catch (screenshotError: unknown) {
    process.stderr.write(
      `[test failure] Failed to capture failure screenshot: ${screenshotError instanceof Error ? screenshotError.message : String(screenshotError)}\n`,
    )
  }
}

declare module 'bun:test' {
  interface Matchers<T = unknown> {
    readonly toHaveCount: (expected: number, options?: { readonly timeout?: number }) => Promise<void>
    readonly toBeVisible: (options?: { readonly timeout?: number }) => Promise<void>
    readonly _phantom?: T
  }
  interface AsymmetricMatchers {
    readonly toHaveCount: (expected: number, options?: { readonly timeout?: number }) => Promise<void>
    readonly toBeVisible: (options?: { readonly timeout?: number }) => Promise<void>
  }
}

augmentedExpect.extend({
  async toHaveCount(
    this: { readonly isNot?: boolean } | void,
    actual: unknown,
    expected: number,
    options?: { readonly timeout?: number },
  ) {
    if (!isLocator(actual)) {
      return {
        pass: false,
        message: () => `expected a Locator instance, received ${typeof actual}`,
      }
    }
    const timeoutMs = options?.timeout ?? 5_000
    const deadline = Temporal.Now.instant().epochMilliseconds + timeoutMs
    const isNegated = Boolean(this?.isNot)

    const pollCount = async (): Promise<{ readonly pass: boolean, readonly count: number }> => {
      const current = await actual.count()
      const match = current === expected
      if (isNegated ? !match : match) {
        return { pass: match, count: current }
      }
      const now = Temporal.Now.instant().epochMilliseconds
      if (now >= deadline) {
        return { pass: match, count: current }
      }
      await Bun.sleep(Math.min(100, Math.max(0, deadline - now)))
      return pollCount()
    }

    const result = await pollCount()
    return {
      pass: result.pass,
      message: () =>
        isNegated
          ? `expected locator count not to be ${expected}, got ${result.count}`
          : `expected locator count to be ${expected}, got ${result.count} (timed out after ${timeoutMs}ms)`,
    }
  },

  async toBeVisible(
    this: { readonly isNot?: boolean } | void,
    actual: unknown,
    options?: { readonly timeout?: number },
  ) {
    if (!isLocator(actual)) {
      return {
        pass: false,
        message: () => `expected a Locator instance, received ${typeof actual}`,
      }
    }
    const timeoutMs = options?.timeout ?? 5_000
    const deadline = Temporal.Now.instant().epochMilliseconds + timeoutMs
    const isNegated = Boolean(this?.isNot)

    const pollVis = async (): Promise<boolean> => {
      const visible = await actual.isVisible()
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

export { augmentedExpect as expect }

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
  baseRunner: typeof bunTest,
) {
  return (
    name: string,
    fn?: TestCallback,
    options?: number | Record<string, unknown>,
  ) => {
    if (fn === undefined) {
      return baseRunner(name, () => {})
    }
    return baseRunner(name, wrapTestCallback(name, fn), options)
  }
}

export const test = Object.assign(createTestWrapper(bunTest), {
  describe,
  skip: createTestWrapper(bunTest.skip),
  only: createTestWrapper(bunTest.only),
  fixme: createTestWrapper(bunTest.skip),
  use: (_options?: { readonly theme?: 'dark' | 'light' }): void => {},
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
})

afterAll(async () => {
  await closeActiveCdpConnection()
})
