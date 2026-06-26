import { test as base, expect, chromium } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { ChildProcess } from 'node:child_process'
import * as path from 'node:path'
import * as net from 'node:net'
import {
  OBSIDIAN_VERSION,
  launchObsidian,
  prepareObsidian,
  prepareVault,
} from '../../scripts/lib/obsidian'

const ROOT_DIR = path.resolve(import.meta.dirname, '../../')
const VAULT_PATH = path.join(ROOT_DIR, 'obsidian-bases-charts-example-vault')
const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')
const PLUGIN_ID = 'obsidian-bases-charts'

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

async function waitForCDP(port: number, proc: ChildProcess, maxAttempts = 30, delayMs = 1000): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (proc.exitCode !== null) {
      throw new Error(`Obsidian process exited early with code ${proc.exitCode}`)
    }
    try {
      const browser = await chromium.connectOverCDP(`http://localhost:${port}`, { timeout: 2000 })
      await browser.close()
      return
    }
    catch {
      // eslint-disable-next-line obsidianmd/prefer-window-timers
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw new Error(`Obsidian CDP on port ${port} did not become ready after ${maxAttempts} attempts`)
}

export type ObsidianPage = {
  readonly page: Page
}

type ObsidianFixtures = {
  readonly obsidianPage: ObsidianPage
}

export const test = base.extend<ObsidianFixtures>({
  obsidianPage: async ({}, use) => {
    const port = await findFreePort()
    const binary = await prepareObsidian({ version: OBSIDIAN_VERSION, cacheDir: CACHE_DIR })
    const vault = await prepareVault({
      vault: VAULT_PATH,
      copy: true,
      plugin: { id: PLUGIN_ID, sourceDir: ROOT_DIR },
    })

    const { proc } = launchObsidian({
      binary,
      vault: vault.path,
      remoteDebuggingPort: port,
      stdio: 'pipe',
    })

    if (proc.stderr) {
      proc.stderr.on('data', (data: Buffer) => process.stderr.write(`[obsidian] ${data.toString()}`))
    }

    await waitForCDP(port, proc)

    const browser = await chromium.connectOverCDP(`http://localhost:${port}`)
    const context = browser.contexts()[0] ?? await browser.newContext()
    const page = context.pages()[0] ?? await context.newPage()

    await page.waitForFunction(
      () => typeof (window.window as unknown as Record<string, unknown>).app !== 'undefined',
      { timeout: 30_000 },
    )

    await use({ page })

    await browser.close()
    proc.kill()
    await vault.cleanup()
  },
})

export { expect }
