import { test as base, expect, chromium } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { ChildProcess } from 'node:child_process'
import ObsidianLauncher from 'obsidian-launcher'
import * as path from 'node:path'
import * as net from 'node:net'
import * as fs from 'node:fs/promises'
import { Temporal } from 'temporal-polyfill'
import { applyViewMode } from '../vault'
import type { ViewMode } from '../vault'

const ROOT_DIR = path.resolve(import.meta.dirname, '../../')
const VAULT_PATH = path.join(ROOT_DIR, 'bases-chartkit-example-vault')
const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')

// Pinned rather than 'latest' so test runs are reproducible across time; bump deliberately.
const OBSIDIAN_APP_VERSION = '1.13.4'
const OBSIDIAN_INSTALLER_VERSION = '1.13.4'

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
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; the rule can't resolve the thrown type through Playwright's generic expect() callback overload.
      throw new Error(`Obsidian process exited early with code ${proc.exitCode}`)
    }
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`, { timeout: 2000 })
    await browser.close()
  }).toPass({ intervals: [1000], timeout: 30_000 })
}

// Grace period between SIGTERM and a SIGKILL escalation in stopObsidian.
// Confirmed necessary for bck-0ic via two separate live reproductions
// (2026-07-28): a genuinely orphaned process never exited on its own, and
// -- more surprisingly -- a normal, successful, non-orphaned test run also
// needed this escalation every time in this environment. Testing 5s vs 15s
// made no difference to the outcome (only to how long the test waited
// first), so Electron appears to simply never respond to SIGTERM once it
// hits the "GPU process isn't usable" FATAL state seen in this environment,
// rather than just being slow to shut down -- kept short since waiting
// longer buys nothing. Root cause of that FATAL state itself is untracked;
// this only guarantees the process actually exits either way.
const SIGTERM_GRACE_PERIOD = Temporal.Duration.from({ seconds: 5 })

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

  // Signal the whole process group (negative pid), not just Electron's
  // top-level PID -- launch() spawns with detached:true specifically so
  // this targets the GPU/renderer children too, not only the main process
  // that a bare proc.kill() would reach.
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

type ObsidianOptions = {
  // Presets Obsidian's color scheme before launch via test.use({ theme: ... }).
  // Undefined (the default) leaves the committed example vault's own
  // appearance.json untouched, matching every existing test's behavior.
  readonly theme: ViewMode | undefined
}

type ObsidianFixtures = ObsidianOptions & {
  readonly obsidianPage: ObsidianPage
}

// Guarantees the child + its tmpdirs are cleaned up even if this worker
// process itself is asked to terminate (Ctrl-C, an external test timeout
// sending SIGTERM) while a test is mid-flight -- the try/finally below only
// runs once the pending `await use(...)` actually settles, which a bare
// signal doesn't force by itself. Re-raises the same signal against the
// default disposition afterward so the process still terminates with the
// exit code a caller would normally expect. A true SIGKILL of this worker
// process can't be intercepted at all; that's a hard OS-level limit, not
// something in-process code can work around.
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

export const test = base.extend<ObsidianFixtures>({
  theme: [undefined, { option: true }],
  obsidianPage: async ({ theme }, use) => {
    const port = await findFreePort()
    const launcher = new ObsidianLauncher({ cacheDir: CACHE_DIR })

    // Copied via setupVault (rather than launch()'s own copy:true) so
    // there's a copied-but-not-yet-launched vault to preset appearance.json
    // into before Obsidian ever reads it -- writing after launch() races
    // Obsidian actually reading the file. Matches scripts/vault-dev.ts's
    // validated --theme technique.
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
      // Already copied (and, if requested, theme-preset) above -- copy:false
      // here avoids a redundant second copy of the vault.
      copy: false,
      // Avoids the "GPU process isn't usable" FATAL abort seen repeatedly in
      // this WSL2/Xvfb environment under sustained CDP+canvas activity (see
      // bck-to4): bare --disable-gpu alone still spawns a GPU process for
      // OOP rasterization via SwiftShader, which can hit Chromium's
      // GPU-process crash-retry ceiling just as fast or faster than with no
      // flag at all. These four keep Chromium off that GPU-process path
      // entirely for canvas compositing instead. Confirmed via 3 consecutive
      // clean e2e trials (zero FATAL) with this combination -- a workaround
      // for the crash-retry ceiling, not a fix for the underlying WSL2/Xvfb
      // GL-context failure itself.
      args: [
        `--remote-debugging-port=${port}`,
        '--disable-gpu',
        '--disable-gpu-compositing',
        '--disable-software-rasterizer',
        '--disable-gpu-sandbox',
      ],
      // detached:true makes this process its own group leader so
      // stopObsidian can SIGTERM/SIGKILL the whole group (including GPU
      // children), not just the top-level PID.
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
  },
})

export { expect }
