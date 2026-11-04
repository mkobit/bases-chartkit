import { describe, expect, test } from 'bun:test'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import {
  getCdpPort,
  sanitizeTestTitle,
  createObsidianPage,
  isLocator,
  resetWorkspace,
  captureFailureScreenshot,
  evaluateObsidian,
  test as fixtureTest,
  expect as fixtureExpect,
  setCdpClientForTesting,
  closeActiveCdpConnection,
  ROOT_DIR,
  VAULT_PATH,
} from '../e2e/fixtures/obsidian'
import { connectCdp } from '../e2e/cdp/client'

interface MockServerOptions {
  readonly evaluateValue?: unknown
  readonly evaluateError?: string
}

function createMockCdpServer(options?: MockServerOptions) {
  return Bun.serve({
    port: 0,
    fetch(req, server) {
      if (server.upgrade(req)) {
        return undefined
      }
      return new Response('WebSocket upgrade required', { status: 400 })
    },
    websocket: {
      message(ws, raw) {
        const payload = typeof raw === 'string' ? raw : ''
        const parsed: { readonly id?: number, readonly method?: string } = JSON.parse(payload)

        if (parsed.method === 'Runtime.evaluate') {
          if (options?.evaluateError !== undefined) {
            ws.send(JSON.stringify({
              id: parsed.id,
              result: {
                exceptionDetails: {
                  text: options.evaluateError,
                },
              },
            }))
            return
          }
          ws.send(JSON.stringify({
            id: parsed.id,
            result: {
              result: {
                value: options?.evaluateValue ?? true,
              },
            },
          }))
          return
        }

        if (parsed.method === 'Page.captureScreenshot') {
          ws.send(JSON.stringify({
            id: parsed.id,
            result: {
              data: Buffer.from('fake-screenshot-data').toString('base64'),
            },
          }))
          return
        }

        ws.send(JSON.stringify({
          id: parsed.id,
          result: {},
        }))
      },
    },
  })
}

describe('Chrome DevTools Protocol port validation', () => {
  test('throws informative error when OBSIDIAN_CDP_PORT is undefined', () => {
    expect(() => getCdpPort({})).toThrow('OBSIDIAN_CDP_PORT environment variable is missing')
  })

  test('throws informative error when OBSIDIAN_CDP_PORT is whitespace', () => {
    expect(() => getCdpPort({ OBSIDIAN_CDP_PORT: '   ' })).toThrow('OBSIDIAN_CDP_PORT environment variable is missing')
  })

  test('throws informative error when OBSIDIAN_CDP_PORT is not a number', () => {
    expect(() => getCdpPort({ OBSIDIAN_CDP_PORT: 'invalid-port' })).toThrow('OBSIDIAN_CDP_PORT environment variable is invalid')
  })

  test('throws informative error when OBSIDIAN_CDP_PORT is out of range', () => {
    expect(() => getCdpPort({ OBSIDIAN_CDP_PORT: '70000' })).toThrow('OBSIDIAN_CDP_PORT environment variable is invalid')
  })

  test('returns numeric port when OBSIDIAN_CDP_PORT is valid', () => {
    expect(getCdpPort({ OBSIDIAN_CDP_PORT: '9222' })).toBe(9222)
  })
})

describe('Test title sanitization', () => {
  test('converts test title to lowercase kebab-case for screenshots', () => {
    const rawTitle = 'Hovering The First Point Shows Coordinates in Tooltip!'
    expect(sanitizeTestTitle(rawTitle)).toBe('hovering-the-first-point-shows-coordinates-in-tooltip')
  })

  test('trims special characters and consecutive hyphens', () => {
    const rawTitle = '---[Feature]: Bar chart #1 (rendering test)---'
    expect(sanitizeTestTitle(rawTitle)).toBe('feature-bar-chart-1-rendering-test')
  })
})

describe('Obsidian page object methods', () => {
  test('evaluates function with arguments via CDP client', async () => {
    const server = createMockCdpServer({ evaluateValue: 'computed-result' })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const result = await page.evaluate((args: { readonly message: string }) => {
        return args.message
      }, { message: 'computed-result' })

      expect(result).toBe('computed-result')
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('evaluates string expression directly via CDP client', async () => {
    const server = createMockCdpServer({ evaluateValue: 123 })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const result = await page.evaluate<number>('100 + 23')
      expect(result).toBe(123)
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('interpolates mouse movements when steps > 1', async () => {
    const server = createMockCdpServer()
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      await page.mouse.move(30, 60, { steps: 3 })
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('dispatches key press events', async () => {
    const server = createMockCdpServer()
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      await page.keyboard.press('Escape')
      await page.keyboard.press('a')
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('captures screenshot through client', async () => {
    const server = createMockCdpServer()
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const buffer = await page.screenshot({ format: 'png' })
      expect(buffer.toString()).toBe('fake-screenshot-data')
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('waitForFunction resolves when predicate returns truthy', async () => {
    const server = createMockCdpServer({ evaluateValue: true })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      await page.waitForFunction(() => true, { timeout: 500 })
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('waitForFunction times out when predicate returns false', async () => {
    const server = createMockCdpServer({ evaluateValue: false })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      let failureError: Error | null = null
      try {
        await page.waitForFunction(() => false, { timeout: 100 })
      }
      catch (error: unknown) {
        if (error instanceof Error) {
          failureError = error
        }
      }
      expect(failureError?.message).toContain('waitForFunction timed out after 100ms')
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })
})

describe('Locator operations and brand detection', () => {
  test('isLocator returns true for locator instances', async () => {
    const server = createMockCdpServer()
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const locator = page.locator('.bases-echarts')
      expect(isLocator(locator)).toBe(true)
      expect(isLocator(null)).toBe(false)
      expect(isLocator({})).toBe(false)
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('locator count evaluates element length', async () => {
    const server = createMockCdpServer({ evaluateValue: 3 })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const locator = page.locator('.chart-bar')
      const count = await locator.count()
      expect(count).toBe(3)
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('locator first creates locator restricting to first element', async () => {
    const server = createMockCdpServer({ evaluateValue: 1 })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const firstLocator = page.locator('.chart-bar').first()
      expect(isLocator(firstLocator)).toBe(true)
      const count = await firstLocator.count()
      expect(count).toBe(1)
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('locator click evaluates click script', async () => {
    const server = createMockCdpServer({ evaluateValue: true })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const button = page.locator('.clickable-icon')
      await button.click()
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('locator isVisible checks visibility', async () => {
    const server = createMockCdpServer({ evaluateValue: true })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const notice = page.locator('.notice', { hasText: 'success' })
      const visible = await notice.isVisible()
      expect(visible).toBe(true)
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })
})

describe('Custom expect matchers for locators', () => {
  test('toHaveCount matches expected locator count', async () => {
    const server = createMockCdpServer({ evaluateValue: 2 })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const locator = page.locator('.item')
      await fixtureExpect(locator).toHaveCount(2)
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('toHaveCount supports negation with not', async () => {
    const server = createMockCdpServer({ evaluateValue: 5 })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const locator = page.locator('.item')
      await fixtureExpect(locator).not.toHaveCount(2)
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('toBeVisible verifies element visibility', async () => {
    const server = createMockCdpServer({ evaluateValue: true })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const locator = page.locator('.notice')
      await fixtureExpect(locator).toBeVisible({ timeout: 500 })
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('toBeVisible supports negation with not', async () => {
    const server = createMockCdpServer({ evaluateValue: false })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const locator = page.locator('.notice')
      await fixtureExpect(locator).not.toBeVisible({ timeout: 200 })
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })
})

describe('Workspace reset and failure screenshots', () => {
  test('resetWorkspace executes detachment and modal cleanup', async () => {
    const server = createMockCdpServer()
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      await resetWorkspace(page)
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('captureFailureScreenshot writes PNG to test-results directory', async () => {
    const server = createMockCdpServer()
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)
    const title = 'Sample failure test'

    try {
      await captureFailureScreenshot(page, title)

      const expectedPath = path.resolve(process.cwd(), 'test-results', 'sample-failure-test-failure.png')
      const fileExists = await fs.access(expectedPath).then(() => true).catch(() => false)
      expect(fileExists).toBe(true)

      await fs.rm(expectedPath, { force: true })
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })
})

describe('evaluateObsidian wrapper', () => {
  test('evaluates with explicit page, function, and arguments', async () => {
    const server = createMockCdpServer({ evaluateValue: 'success-explicit' })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const result = await evaluateObsidian(page, (_app, args: { readonly key: string }) => {
        return args.key
      }, { key: 'test-value' })

      expect(result).toBe('success-explicit')
    }
    finally {
      await client.close()
      await server.stop(true)
    }
  })

  test('evaluates with implicit active page when page argument omitted', async () => {
    const server = createMockCdpServer({ evaluateValue: 'success-implicit' })
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    setCdpClientForTesting(client)

    try {
      const result = await evaluateObsidian((_app, args: { readonly message: string }) => {
        return args.message
      }, { message: 'hello-obsidian' })

      expect(result).toBe('success-implicit')
    }
    finally {
      setCdpClientForTesting(null)
      await client.close()
      await server.stop(true)
    }
  })
})

describe('Fixture test bridge modifiers and constants', () => {
  test('exports ROOT_DIR and VAULT_PATH constants', () => {
    expect(ROOT_DIR).toBeDefined()
    expect(VAULT_PATH).toContain('bases-chartkit-example-vault')
  })

  test('provides test modifier functions', () => {
    expect(typeof fixtureTest).toBe('function')
    expect(typeof fixtureTest.describe).toBe('function')
    expect(typeof fixtureTest.skip).toBe('function')
    expect(typeof fixtureTest.only).toBe('function')
    expect(typeof fixtureTest.fixme).toBe('function')
    expect(typeof fixtureTest.use).toBe('function')
    expect(typeof fixtureTest.beforeEach).toBe('function')
    expect(typeof fixtureTest.afterEach).toBe('function')
    expect(typeof fixtureTest.beforeAll).toBe('function')
    expect(typeof fixtureTest.afterAll).toBe('function')
  })

  test('test.use operates as a no-op configuration helper', () => {
    expect(() => fixtureTest.use({ theme: 'dark' })).not.toThrow()
    expect(() => fixtureTest.use({ theme: 'light' })).not.toThrow()
  })

  test('closeActiveCdpConnection cleanly closes active client', async () => {
    const server = createMockCdpServer()
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    setCdpClientForTesting(client)

    try {
      await closeActiveCdpConnection()
    }
    finally {
      await server.stop(true)
    }
  })
})
