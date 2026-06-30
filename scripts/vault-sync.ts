#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as fsSync from 'node:fs'
import * as path from 'node:path'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const SRC_VAULT = path.join(ROOT_DIR, 'obsidian-bases-charts-example-vault')
const PLUGIN_ID = 'obsidian-bases-charts'
const PLUGIN_ARTIFACTS = ['main.js', 'manifest.json', 'styles.css'] as const
const VAULT_BASENAME = 'obsidian-bases-charts-example-vault'
const WATCH_DEBOUNCE_MS = 500

function run(cmd: string, args: readonly string[], stdio: 'inherit' | 'pipe' = 'inherit'): Promise<{ readonly stdout: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, [...args], { stdio: stdio === 'inherit' ? 'inherit' : ['ignore', 'pipe', 'inherit'] })
    const chunks: Buffer[] = []
    if (proc.stdout) {
      proc.stdout.on('data', (c: Buffer) => chunks.push(c))
    }
    proc.on('error', reject)
    proc.on('close', code => code === 0
      ? resolve({ stdout: Buffer.concat(chunks).toString('utf8') })
      : reject(new Error(`${cmd} exited ${code}`)))
  })
}

// Detect Windows user's Documents folder via PowerShell, then convert to a
// WSL-accessible path. Honors OneDrive/redirected Documents. Falls back if
// we're not on WSL.
async function detectDefaultDest(): Promise<string | null> {
  try {
    const { stdout } = await run(
      'powershell.exe',
      ['-NoProfile', '-Command', '[Environment]::GetFolderPath(\'MyDocuments\')'],
      'pipe',
    )
    const winPath = stdout.replaceAll('\r', '').trim()
    if (!winPath) {
      return null
    }
    const { stdout: wslOut } = await run('wslpath', [winPath], 'pipe')
    const wslPath = wslOut.trim()
    return path.join(wslPath, VAULT_BASENAME)
  }
  catch {
    return null
  }
}

function parseArgs(): { readonly watch: boolean, readonly destArg: string | null } {
  const argv = process.argv.slice(2)
  const watch = argv.includes('--watch')
  const positional = argv.find(a => !a.startsWith('--')) ?? null
  return { watch, destArg: positional }
}

async function resolveDest(destArg: string | null): Promise<string> {
  if (destArg) {
    return destArg
  }
  const detected = await detectDefaultDest()
  if (!detected) {
    console.error('Could not auto-detect Windows Documents folder.')
    console.error('Usage: bun run vault:sync [destination] [--watch]')
    console.error('  e.g. /mnt/c/Users/<you>/Documents/obsidian-bases-charts-example-vault')
    process.exit(1)
  }
  return detected
}

async function syncOnce(dest: string): Promise<void> {
  // Verify the plugin is built
  await Promise.all(PLUGIN_ARTIFACTS.map(async (f) => {
    try {
      await fs.access(path.join(ROOT_DIR, f))
    }
    catch {
      throw new Error(`Missing ${f} at repo root — run \`bun run build\` (or \`bun run dev\` for watch+sourcemaps) first`)
    }
  }))

  // Sync vault content. Excludes preserve Obsidian's per-machine workspace
  // state on the destination so the user's open tabs survive re-syncs;
  // the plugins/ dir is rewritten by the cp step below.
  await run('rsync', [
    '-a',
    '--delete',
    '--exclude=/.obsidian/workspace.json',
    '--exclude=/.obsidian/workspace-mobile.json',
    '--exclude=/.obsidian/cache',
    '--exclude=/.obsidian/plugins',
    `${SRC_VAULT}/`,
    `${dest}/`,
  ], 'pipe')

  const pluginDir = path.join(dest, '.obsidian', 'plugins', PLUGIN_ID)
  await fs.mkdir(pluginDir, { recursive: true })
  await Promise.all(PLUGIN_ARTIFACTS.map(f =>
    fs.cp(path.join(ROOT_DIR, f), path.join(pluginDir, f)),
  ))
}

function startWatch(dest: string): void {
  console.log(`\nWatching ${ROOT_DIR} for plugin-artifact changes — Ctrl-C to exit.\n`)
  let pending: NodeJS.Timeout | null = null
  let syncing = false

  const trigger = (): void => {
    if (pending !== null) {
      clearTimeout(pending)
    }
    pending = setTimeout(() => {
      pending = null
      if (syncing) {
        return
      }
      syncing = true
      const start = Date.now()
      syncOnce(dest)
        .then(() => {
          const ms = Date.now() - start
          console.log(`[${new Date().toISOString()}] resynced (${ms}ms)`)
        })
        .catch((err: unknown) => {
          console.error(`[${new Date().toISOString()}] sync failed:`, err)
        })
        .finally(() => {
          syncing = false
        })
    }, WATCH_DEBOUNCE_MS)
  }

  for (const f of PLUGIN_ARTIFACTS) {
    const target = path.join(ROOT_DIR, f)
    try {
      fsSync.watch(target, () => {
        trigger()
      })
    }
    catch (err) {
      console.error(`Could not watch ${target}:`, err)
    }
  }
}

async function main(): Promise<void> {
  const { watch, destArg } = parseArgs()
  const dest = await resolveDest(destArg)

  await syncOnce(dest)
  console.log(`Vault synced to: ${dest}`)
  console.log(`Plugin installed at: ${path.join(dest, '.obsidian', 'plugins', PLUGIN_ID)}`)

  if (watch) {
    startWatch(dest)
    return
  }

  console.log('\nNext steps:')
  console.log('  1. Open the folder as a vault in Windows Obsidian (one-time)')
  console.log(`     File → Open another vault → Open folder as vault → ${path.basename(dest)}`)
  console.log('  2. For iterative dev, in two terminals:')
  console.log('     bun run dev               # esbuild watch + inline sourcemaps')
  console.log('     bun run vault:sync --watch')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
