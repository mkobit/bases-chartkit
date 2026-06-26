#!/usr/bin/env bun
import * as path from 'node:path'
import { prepareVault } from './lib/obsidian'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const VAULT_PATH = path.join(ROOT_DIR, 'obsidian-bases-charts-example-vault')
const PLUGIN_ID = 'obsidian-bases-charts'

async function main(): Promise<void> {
  const vault = await prepareVault({
    vault: VAULT_PATH,
    copy: false,
    plugin: { id: PLUGIN_ID, sourceDir: ROOT_DIR },
  })

  console.log(`Installed plugin into ${path.join(vault.path, '.obsidian', 'plugins', PLUGIN_ID)}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
