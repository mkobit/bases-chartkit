import { test as base, expect, chromium } from '@playwright/test'
import type { Page } from '@playwright/test'
import ObsidianLauncher from 'obsidian-launcher'
import * as path from 'node:path'
import * as net from 'node:net'

const ROOT_DIR = path.resolve(import.meta.dirname, '../../')
const VAULT_PATH = path.join(ROOT_DIR, 'example')
const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, () => {
      const addr = server.address()
      server.close(() => {
        if (addr !== null && typeof addr === 'object') {
          resolve(addr.port)
        }
        else {
          reject(new Error('Could not determine free port'))
        }
      })
    })
  })
}

async function waitForCDP(port: number, maxAttempts = 30, delayMs = 500): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const browser = await chromium.connectOverCDP(`http://localhost:${port}`, { timeout: 2000 })
      await browser.close()
      return
    }
    catch {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  throw new Error(`Obsidian CDP on port ${port} did not become ready after ${maxAttempts} attempts`)
}

export type ObsidianPage = Readonly<{
  page: Page
}>

type ObsidianFixtures = Readonly<{
  obsidianPage: ObsidianPage
}>

export const test = base.extend<ObsidianFixtures>({
  obsidianPage: async ({}, use) => {
    const port = await findFreePort()
    const launcher = new ObsidianLauncher({ cacheDir: CACHE_DIR })

    const { proc } = await launcher.launch({
      appVersion: 'earliest',
      installerVersion: 'earliest',
      vault: VAULT_PATH,
      copy: true,
      plugins: [ROOT_DIR],
      args: [
        `--remote-debugging-port=${port}`,
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    })

    await waitForCDP(port)

    const browser = await chromium.connectOverCDP(`http://localhost:${port}`)
    const context = browser.contexts()[0] ?? await browser.newContext()
    const page = context.pages()[0] ?? await context.newPage()

    await page.waitForFunction(
      () => typeof (window as unknown as Record<string, unknown>).app !== 'undefined',
      { timeout: 30_000 },
    )

    await use({ page })

    await browser.close()
    proc.kill()
  },
})

export { expect }
