import { test as base, expect, chromium } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { ChildProcess } from 'node:child_process'
import ObsidianLauncher from 'obsidian-launcher'
import * as path from 'node:path'
import * as net from 'node:net'
import * as fs from 'node:fs/promises'
import { Temporal } from 'temporal-polyfill'
import { applyViewMode } from '../../shared/appearance'
import type { ViewMode } from '../../shared/appearance'
import { evaluateObsidian } from '../helpers/evaluate'

export const ROOT_DIR = path.resolve(import.meta.dirname, '../../')
export const VAULT_PATH = path.join(ROOT_DIR, 'bases-chartkit-example-vault')
export const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')

export const OBSIDIAN_APP_VERSION = '1.13.4'
export const OBSIDIAN_INSTALLER_VERSION = '1.13.4'

export function findFreePort(): Promise<number> {
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

export async function waitForCDP(port: number, proc: ChildProcess): Promise<void> {
  await expect(async () => {
    if (proc.exitCode !== null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- see comment in original file
      throw new Error(`Obsidian process exited early with code ${proc.exitCode}`)
    }
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`, { timeout: 30_000 })
    await browser.close()
  }).toPass({ intervals: [1000], timeout: 30_000 })
}

const SIGTERM_GRACE_PERIOD = Temporal.Duration.from({ seconds: 5 })

export async function stopObsidian(proc: ChildProcess, configDir: string, vault: string | undefined): Promise<void> {
  const exited = proc.exitCode !== null || proc.signalCode !== null
    ? Promise.resolve()
    : new Promise<void>((resolve) => { proc.once('exit', () => resolve()) })

  if (proc.pid !== undefined) {
    process.kill(-proc.pid, 'SIGTERM')
  }

  const outcome = await Promise.race([
    exited.then(() => 'exited' as const),
    new Promise<'timed-out'>((resolve) => { setTimeout(() => resolve('timed-out'), SIGTERM_GRACE_PERIOD.total('milliseconds')) }),
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

export type ObsidianPage = {
  readonly page: Page
}

type ObsidianWorkerOptions = {
  readonly theme: ViewMode | undefined
}

type ObsidianWorkerFixtures = ObsidianWorkerOptions & {
  readonly obsidianPage: ObsidianPage
}

type ObsidianTestFixtures = {
  readonly resetWorkspace: void
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

export const test = base.extend<ObsidianTestFixtures, ObsidianWorkerFixtures>({
  theme: [undefined, { option: true, scope: 'worker' }],
  obsidianPage: [async ({ theme }, use) => {
    const port = await findFreePort()
    const launcher = new ObsidianLauncher({ cacheDir: CACHE_DIR })

    const copiedVault = await launcher.setupVault({
      vault: VAULT_PATH,
      copy: true,
      plugins: [ROOT_DIR],
    })
    if (theme) {
      await applyViewMode(copiedVault, theme)
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
      ],
      spawnOptions: { stdio: 'pipe', detached: true },
    })

    if (proc.stderr) {
      proc.stderr.on('data', (data: Buffer) => process.stderr.write(`[obsidian] ${data.toString()}`))
    }

    const removeSignalHandlers = terminateOnSignal(proc, configDir, vault)

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
      removeSignalHandlers()
      await stopObsidian(proc, configDir, vault)
    }
  }, { scope: 'worker' }],

  resetWorkspace: [async ({ obsidianPage: { page } }, use) => {
    await evaluateObsidian(page, (app) => {
      app.workspace.detachLeavesOfType('bases')
    })
    await use()
  }, { auto: true }],
})

export { expect }
