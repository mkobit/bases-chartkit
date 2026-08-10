#!/usr/bin/env bun
import ObsidianLauncher from 'obsidian-launcher'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const VAULT_PATH = path.join(ROOT_DIR, 'bases-chartkit-example-vault')
const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')

const DEFAULT_EXAMPLE_DATA = {
  upColor: '#14b143',
  downColor: '#ef232a',
  mySetting: 'default',
  defaultHeight: '100%',
  customThemes: [
    {
      name: 'Vintage',
      json: JSON.stringify({
        color: ['#d87c7c', '#919e8b', '#d7ab82', '#6e7074', '#61a0a8', '#efa18d', '#787464', '#cc7e63', '#724e58', '#4b565b'],
        backgroundColor: 'rgba(254,248,239,1)',
      }),
    },
    {
      name: 'Cool',
      json: JSON.stringify({
        color: ['#07a2a4', '#9a7fd1', '#588dd5', '#f5994e', '#c05050', '#59678c', '#c9ab00', '#7eb00a'],
      }),
    },
  ],
  selectedTheme: '',
}

async function main(): Promise<void> {
  const launcher = new ObsidianLauncher({ cacheDir: CACHE_DIR })
  await launcher.installPlugins(VAULT_PATH, [{ path: ROOT_DIR }])
  const pluginDir = path.join(VAULT_PATH, '.obsidian', 'plugins', 'bases-chartkit')
  await fs.writeFile(path.join(pluginDir, 'data.json'), JSON.stringify(DEFAULT_EXAMPLE_DATA, null, 2))
  console.log(`Installed plugin and sample themes data.json into ${pluginDir}`)
}

main().catch((err: unknown) => {
  console.error('Fatal error in vault-install:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
