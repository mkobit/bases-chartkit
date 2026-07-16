#!/usr/bin/env bun
import ObsidianLauncher from 'obsidian-launcher'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const VAULT_PATH = path.join(ROOT_DIR, 'obsidian-bases-charts-example-vault')
const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')
const CDP_PORT = 9222
// Electron ignores the `--window-size` Chromium switch and always opens at
// its own ~1024x800 default for a fresh profile — resizing via the
// renderer's `window.resizeTo` (which Electron forwards to the
// BrowserWindow) is what actually works.
const WINDOW_WIDTH = 2560
const WINDOW_HEIGHT = 1440

interface CdpPage {
  readonly type: string
  readonly webSocketDebuggerUrl: string
}

async function findObsidianPage(): Promise<CdpPage | undefined> {
  try {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pages: readonly CdpPage[] = await res.json()
    return pages.find(p => p.type === 'page')
  }
  catch {
    return undefined
  }
}

function resizeOverWebsocket(wsUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    ws.addEventListener('error', () => reject(new Error('ws error connecting to CDP')))
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: `window.resizeTo(${WINDOW_WIDTH}, ${WINDOW_HEIGHT})` },
      }))
    })
    ws.addEventListener('message', () => {
      ws.close()
      resolve()
    })
  })
}

async function resizeWindowWhenReady(attemptsRemaining = 20): Promise<void> {
  const page = await findObsidianPage()
  if (page) {
    await resizeOverWebsocket(page.webSocketDebuggerUrl)
    return
  }
  if (attemptsRemaining <= 0) {
    console.error('Timed out waiting for Obsidian CDP page to resize the window.')
    return
  }
  await Bun.sleep(500)
  await resizeWindowWhenReady(attemptsRemaining - 1)
}

async function main(): Promise<void> {
  const launcher = new ObsidianLauncher({ cacheDir: CACHE_DIR })

  const { proc, configDir, vault } = await launcher.launch({
    appVersion: 'latest',
    installerVersion: 'latest',
    vault: VAULT_PATH,
    // Copied to a tmpdir so interactive poking never dirties the
    // git-tracked example vault (Obsidian rewrites .base YAML and
    // workspace state on every view interaction). Neither this copy nor
    // `configDir` below is cleaned up by obsidian-launcher itself -- both
    // are plain tmpdirs left for the caller to remove, which is what the
    // `proc.on('close', ...)` cleanup does.
    copy: true,
    plugins: [ROOT_DIR, { id: 'hot-reload' }],
    args: [
      '--disable-gpu',
      `--remote-debugging-port=${CDP_PORT}`,
      '--remote-allow-origins=*',
    ],
    spawnOptions: { stdio: 'inherit' },
  })

  console.log(`\nCDP: http://localhost:${CDP_PORT} — connect with \`bun scripts/vault-eval.ts '<js>'\` or chromium devtools\n`)

  void resizeWindowWhenReady()

  const forwardSignal = (signal: NodeJS.Signals): void => {
    process.on(signal, () => proc.kill(signal))
  }
  forwardSignal('SIGINT')
  forwardSignal('SIGTERM')

  proc.on('close', (code) => {
    void Promise.allSettled([
      fs.rm(configDir, { recursive: true, force: true }),
      vault ? fs.rm(vault, { recursive: true, force: true }) : Promise.resolve(),
    ]).then(() => process.exit(code ?? 0))
  })
}

main().catch((err: unknown) => {
  console.error('Fatal error in vault-dev:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
