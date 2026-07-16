import { test as base, expect, chromium } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { ChildProcess } from 'node:child_process'
import ObsidianLauncher from 'obsidian-launcher'
import * as path from 'node:path'
import * as net from 'node:net'
import * as fs from 'node:fs/promises'

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
      throw new Error(`Obsidian process exited early with code ${proc.exitCode}`)
    }
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`, { timeout: 2000 })
    await browser.close()
  }).toPass({ intervals: [1000], timeout: 30_000 })
}

// obsidian-launcher doesn't clean up the configDir/vault-copy tmpdirs it
// creates per launch -- without this, every test run leaks a fresh configDir
// (~26MB) and vault copy into the OS tmpdir forever. Called from `finally`
// so it still runs if setup (waitForCDP, connectOverCDP, etc.) throws --
// otherwise a failed test run leaks a live Electron process, not just disk.
async function stopObsidian(proc: ChildProcess, configDir: string, vault: string | undefined): Promise<void> {
  // Check whether the process already exited (e.g. it crashed on its own
  // during the test) before registering the listener -- 'exit' only fires
  // once, so registering it after the process has already exited would
  // hang forever waiting for an event that already happened.
  const exited = proc.exitCode !== null || proc.signalCode !== null
    ? Promise.resolve()
    : new Promise<void>((resolve) => { proc.once('exit', () => resolve()) })
  proc.kill()
  // `kill()` only sends the signal -- Electron still needs a moment to
  // release its file locks on configDir, so cleanup must wait for the
  // process to actually exit rather than racing it.
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

    const { proc, configDir, vault } = await launcher.launch({
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

    try {
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
    }
    finally {
      await stopObsidian(proc, configDir, vault)
    }
  },
})

export { expect }
