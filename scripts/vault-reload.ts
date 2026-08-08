#!/usr/bin/env bun
// Refresh the plugin in the running `vault:dev` Obsidian without restarting.
// Copies the freshly-built main.js/manifest.json/styles.css into the live
// vault's plugin directory, then reloads it via Obsidian's official CLI
// (https://obsidian.md/help/cli) so Obsidian picks up the new bundle.
//
// Iteration loop: `bun run dev` (esbuild watch) → edit → `bun run vault:reload`

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { runObsidianCli } from './obsidian-cli'

const PLUGIN_ID = 'bases-chartkit'
const PLUGIN_ARTIFACTS = ['main.js', 'manifest.json', 'styles.css'] as const
const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const VAULT_PATH = path.join(ROOT_DIR, 'bases-chartkit-example-vault')

async function main(): Promise<void> {
  // Copy fresh artifacts in
  const pluginDir = path.join(VAULT_PATH, '.obsidian', 'plugins', PLUGIN_ID)
  await fs.mkdir(pluginDir, { recursive: true })
  await Promise.all(PLUGIN_ARTIFACTS.map(async (f) => {
    const src = path.join(ROOT_DIR, f)
    try {
      await fs.access(src)
    }
    catch {
      console.error(`Missing ${f} at repo root — run \`bun run build\` or \`bun run dev\` first`)
      process.exit(1)
    }
    await fs.cp(src, path.join(pluginDir, f))
  }))

  const { stdout, stderr, exitCode } = await runObsidianCli(['plugin:reload', `id=${PLUGIN_ID}`])
  if (exitCode !== 0) {
    console.error(stderr || 'obsidian-cli plugin:reload failed — is `bun run vault:dev` running?')
    process.exit(exitCode)
  }
  console.log(stdout || `Reloaded ${PLUGIN_ID}`)
}

main().catch((err: unknown) => {
  console.error('Fatal error in vault-reload:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
