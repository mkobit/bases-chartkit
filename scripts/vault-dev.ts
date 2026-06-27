#!/usr/bin/env bun
import ObsidianLauncher from 'obsidian-launcher'
import * as path from 'node:path'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const VAULT_PATH = path.join(ROOT_DIR, 'obsidian-bases-charts-example-vault')
const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')

async function main(): Promise<void> {
  const launcher = new ObsidianLauncher({ cacheDir: CACHE_DIR })

  const { proc } = await launcher.launch({
    appVersion: 'latest',
    installerVersion: 'latest',
    vault: VAULT_PATH,
    copy: false,
    plugins: [ROOT_DIR],
    args: ['--disable-gpu'],
    spawnOptions: { stdio: 'inherit' },
  })

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
  console.error(err)
  process.exit(1)
})
