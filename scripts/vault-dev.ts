#!/usr/bin/env bun
// Usage: bun run vault:dev [-- --theme <light|dark>]  (defaults to dark)
// `--theme` presets Obsidian's base color scheme before launch, so a manual
// visual pass doesn't have to navigate Settings -> Appearance by hand.
import ObsidianLauncher from 'obsidian-launcher'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const VAULT_PATH = path.join(ROOT_DIR, 'bases-chartkit-example-vault')
const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')
const CDP_PORT = 9222
// Pinned rather than left at 'latest', matching this file's Obsidian
// app/installer version pins -- keeps `vault:dev` launches reproducible and
// offline-friendly once cached. Bump deliberately.
const HOT_RELOAD_VERSION = '0.3.1'
// Electron ignores the `--window-size` Chromium switch and always opens at
// its own ~1024x800 default for a fresh profile — resizing via the
// renderer's `window.resizeTo` (which Electron forwards to the
// BrowserWindow) is what actually works.
const WINDOW_WIDTH = 2560
const WINDOW_HEIGHT = 1440

// Obsidian's own appearance.json vocabulary for the two built-in base
// themes -- "obsidian" is the dark scheme, "moonstone" is the light scheme.
const OBSIDIAN_THEME_BY_MODE = { dark: 'obsidian', light: 'moonstone' } as const
type ViewMode = keyof typeof OBSIDIAN_THEME_BY_MODE

interface CdpPage {
  readonly type: string
  readonly webSocketDebuggerUrl: string
}

const DEFAULT_VIEW_MODE: ViewMode = 'dark'

function parseThemeArg(argv: readonly string[]): ViewMode {
  const flagIndex = argv.indexOf('--theme')
  if (flagIndex === -1) {
    return DEFAULT_VIEW_MODE
  }
  const value = argv[flagIndex + 1]
  if (value !== 'light' && value !== 'dark') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
    throw new Error(`--theme must be "light" or "dark", got: ${String(value)}`)
  }
  return value
}

async function applyViewMode(vaultPath: string, mode: ViewMode): Promise<void> {
  const appearancePath = path.join(vaultPath, '.obsidian', 'appearance.json')
  const existingRaw = await fs.readFile(appearancePath, 'utf8').catch(() => '{}')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- appearance.json is Obsidian-internal and trusted here; only the `theme` key below is written deliberately.
  const existing = JSON.parse(existingRaw)
  await fs.writeFile(
    appearancePath,
    JSON.stringify({ ...existing, theme: OBSIDIAN_THEME_BY_MODE[mode] }),
  )
}

async function findObsidianPage(): Promise<CdpPage | undefined> {
  try {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- fetch().json() is untyped; CDP response shape is trusted here
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
  const viewMode = parseThemeArg(process.argv.slice(2))
  const launcher = new ObsidianLauncher({ cacheDir: CACHE_DIR })

  // Copied to a tmpdir so interactive poking never dirties the git-tracked
  // example vault (Obsidian rewrites .base YAML and workspace state on
  // every view interaction). Done as its own setupVault() call (rather than
  // via launch()'s copy:true) so there's a copied-but-not-yet-launched vault
  // to write the --theme preset into before Obsidian ever reads it.
  const copiedVault = await launcher.setupVault({
    vault: VAULT_PATH,
    copy: true,
    plugins: [ROOT_DIR, { id: 'hot-reload', version: HOT_RELOAD_VERSION }],
  })

  await applyViewMode(copiedVault, viewMode)

  const { proc, configDir, vault } = await launcher.launch({
    appVersion: 'latest',
    installerVersion: 'latest',
    vault: copiedVault,
    // Already copied and had plugins installed above -- copy:false here
    // avoids a redundant second copy of the vault.
    copy: false,
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
    ]).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          console.warn(`obsidian tmpdir cleanup failed: ${String(result.reason)}`)
        }
      }
      return process.exit(code ?? 0)
    })
  })
}

main().catch((err: unknown) => {
  console.error('Fatal error in vault-dev:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
