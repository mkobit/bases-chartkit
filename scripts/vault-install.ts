#!/usr/bin/env bun
import ObsidianLauncher from 'obsidian-launcher'
import * as path from 'node:path'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const VAULT_PATH = path.join(ROOT_DIR, 'obsidian-bases-charts-example-vault')
const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')

async function main(): Promise<void> {
  const launcher = new ObsidianLauncher({ cacheDir: CACHE_DIR })
  await launcher.installPlugins(VAULT_PATH, [{ path: ROOT_DIR }])
  console.log(`Installed plugin into ${path.join(VAULT_PATH, '.obsidian', 'plugins')}`)
}

main().catch((err: unknown) => {
  console.error('Fatal error in vault-install:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
