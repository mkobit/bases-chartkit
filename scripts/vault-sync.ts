#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const SRC_VAULT = path.join(ROOT_DIR, 'obsidian-bases-charts-example-vault')
const PLUGIN_ID = 'obsidian-bases-charts'
const PLUGIN_ARTIFACTS = ['main.js', 'manifest.json', 'styles.css'] as const
const VAULT_BASENAME = 'obsidian-bases-charts-example-vault'

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

async function resolveDest(): Promise<string> {
  const arg = process.argv[2]
  if (arg) {
    return arg
  }
  const detected = await detectDefaultDest()
  if (!detected) {
    console.error('Could not auto-detect Windows Documents folder.')
    console.error('Usage: bun run vault:sync [destination]')
    console.error('  e.g. /mnt/c/Users/<you>/Documents/obsidian-bases-charts-example-vault')
    process.exit(1)
  }
  return detected
}

async function main(): Promise<void> {
  const dest = await resolveDest()

  // Verify the plugin is built
  await Promise.all(PLUGIN_ARTIFACTS.map(async (f) => {
    try {
      await fs.access(path.join(ROOT_DIR, f))
    }
    catch {
      console.error(`Missing ${f} at repo root — run \`bun run build\` first`)
      process.exit(1)
    }
  }))

  // Sync vault content. Excludes preserve Obsidian's per-machine workspace
  // state on the destination so the user's open tabs survive re-syncs;
  // the plugins/ dir is rewritten by the cp step below.
  await run('rsync', [
    '-av',
    '--delete',
    '--exclude=/.obsidian/workspace.json',
    '--exclude=/.obsidian/workspace-mobile.json',
    '--exclude=/.obsidian/cache',
    '--exclude=/.obsidian/plugins',
    `${SRC_VAULT}/`,
    `${dest}/`,
  ])

  // Install built plugin artifacts
  const pluginDir = path.join(dest, '.obsidian', 'plugins', PLUGIN_ID)
  await fs.mkdir(pluginDir, { recursive: true })
  await Promise.all(PLUGIN_ARTIFACTS.map(f =>
    fs.cp(path.join(ROOT_DIR, f), path.join(pluginDir, f)),
  ))

  console.log(`\nVault synced to: ${dest}`)
  console.log(`Plugin installed at: ${pluginDir}`)
  console.log('\nNext steps:')
  console.log('  1. Open the folder as a vault in Windows Obsidian (one-time)')
  console.log(`     File → Open another vault → Open folder as vault → ${path.basename(dest)}`)
  console.log('  2. After registration the obsidian CLI can target it:')
  console.log(`     obsidian --vault=${path.basename(dest)} vault`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
