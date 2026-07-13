import { test as base, expect, chromium } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { ChildProcess } from 'node:child_process'
import ObsidianLauncher from 'obsidian-launcher'
import * as path from 'node:path'
import * as net from 'node:net'

const ROOT_DIR = path.resolve(import.meta.dirname, '../../')
const VAULT_PATH = path.join(ROOT_DIR, 'obsidian-bases-charts-example-vault')
const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')

// Pinned rather than 'latest' so test runs are reproducible across time; bump deliberately.
const OBSIDIAN_APP_VERSION = '1.12.7'
const OBSIDIAN_INSTALLER_VERSION = '1.12.7'

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

async function waitForCDP(port: number, proc: ChildProcess): Promise<void> {
  await expect(async () => {
    if (proc.exitCode !== null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw new Error(`Obsidian process exited early with code ${String(proc.exitCode)}`)
    }
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`, { timeout: 2000 })
    await browser.close()
  }).toPass({ intervals: [1000], timeout: 30_000 })
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
    const launcher = new ObsidianLauncher({ cacheDir: CACHE_DIR })

    const { proc } = await launcher.launch({
      appVersion: OBSIDIAN_APP_VERSION,
      installerVersion: OBSIDIAN_INSTALLER_VERSION,
      vault: VAULT_PATH,
      copy: true,
      plugins: [ROOT_DIR],
      args: [`--remote-debugging-port=${port}`],
      spawnOptions: { stdio: 'pipe' },
    })

    if (proc.stderr) {
      proc.stderr.on('data', (data: Buffer) => process.stderr.write(`[obsidian] ${data.toString()}`))
    }

    await waitForCDP(port, proc)

    const browser = await chromium.connectOverCDP(`http://localhost:${port}`)
    const context = browser.contexts()[0] ?? await browser.newContext()
    const page = context.pages()[0] ?? await context.newPage()

    await page.waitForFunction(
      () => typeof (window as { app?: unknown }).app !== 'undefined',
      { timeout: 30_000 },
    )

    await use({ page })

    await browser.close()
    proc.kill()
  },
})

export { expect }
