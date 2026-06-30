#!/usr/bin/env bun
import ObsidianLauncher from 'obsidian-launcher'
import * as path from 'node:path'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const VAULT_PATH = path.join(ROOT_DIR, 'obsidian-bases-charts-example-vault')
const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')
const CDP_PORT = 9222

async function main(): Promise<void> {
  const launcher = new ObsidianLauncher({ cacheDir: CACHE_DIR })

  const { proc } = await launcher.launch({
    appVersion: 'latest',
    installerVersion: 'latest',
    vault: VAULT_PATH,
    copy: false,
    plugins: [ROOT_DIR],
    args: [
      '--disable-gpu',
      '--window-size=1920,1080',
      `--remote-debugging-port=${CDP_PORT}`,
      '--remote-allow-origins=*',
    ],
    spawnOptions: { stdio: 'inherit' },
  })

  console.log(`\nCDP: http://localhost:${CDP_PORT} — connect with \`bun scripts/vault-eval.ts '<js>'\` or chromium devtools\n`)

  const forwardSignal = (signal: NodeJS.Signals): void => {
    process.on(signal, () => proc.kill(signal))
  }
  forwardSignal('SIGINT')
  forwardSignal('SIGTERM')

  proc.on('close', (code) => {
    process.exit(code ?? 0)
  })
}

main().catch((err: unknown) => {
  console.error('Fatal error in vault-dev:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
