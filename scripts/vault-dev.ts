#!/usr/bin/env bun
import * as path from 'node:path'
import {
  OBSIDIAN_VERSION,
  launchObsidian,
  prepareObsidian,
  prepareVault,
} from './lib/obsidian'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const VAULT_PATH = path.join(ROOT_DIR, 'obsidian-bases-charts-example-vault')
const CACHE_DIR = path.join(ROOT_DIR, '.obsidian-cache')
const PLUGIN_ID = 'obsidian-bases-charts'

async function main(): Promise<void> {
  const binary = await prepareObsidian({ version: OBSIDIAN_VERSION, cacheDir: CACHE_DIR })
  const vault = await prepareVault({
    vault: VAULT_PATH,
    copy: false,
    plugin: { id: PLUGIN_ID, sourceDir: ROOT_DIR },
  })

  const { proc } = launchObsidian({
    binary,
    vault: vault.path,
    stdio: 'inherit',
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
