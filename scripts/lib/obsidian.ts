import { spawn, type ChildProcess } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

export const OBSIDIAN_VERSION = '1.12.7'

export const PLUGIN_ARTIFACTS = ['main.js', 'manifest.json', 'styles.css'] as const

const appImageUrl = (version: string): string =>
  `https://github.com/obsidianmd/obsidian-releases/releases/download/v${version}/Obsidian-${version}.AppImage`

const fileExists = async (p: string): Promise<boolean> => {
  try {
    await fs.access(p)
    return true
  }
  catch {
    return false
  }
}

const runExtract = (cwd: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const proc = spawn('./Obsidian.AppImage', ['--appimage-extract'], { cwd, stdio: 'pipe' })
    proc.on('error', reject)
    proc.on('close', code => code === 0
      ? resolve()
      : reject(new Error(`AppImage --appimage-extract failed: exit ${code}`)))
  })

export type ObsidianBinary = {
  readonly executable: string
  readonly version: string
  readonly cacheDir: string
}

export const prepareObsidian = async (opts: {
  readonly version: string
  readonly cacheDir: string
}): Promise<ObsidianBinary> => {
  const versionDir = path.join(opts.cacheDir, `obsidian-${opts.version}`)
  const executable = path.join(versionDir, 'squashfs-root', 'obsidian')

  if (await fileExists(executable)) {
    return { executable, version: opts.version, cacheDir: opts.cacheDir }
  }

  await fs.mkdir(versionDir, { recursive: true })
  const appImagePath = path.join(versionDir, 'Obsidian.AppImage')

  if (!await fileExists(appImagePath)) {
    const url = appImageUrl(opts.version)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Download failed for Obsidian ${opts.version}: ${response.status} ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    await fs.writeFile(appImagePath, new Uint8Array(buffer))
  }
  await fs.chmod(appImagePath, 0o755)

  await runExtract(versionDir)

  if (!await fileExists(executable)) {
    throw new Error(`Extraction completed but expected binary missing at ${executable}`)
  }

  return { executable, version: opts.version, cacheDir: opts.cacheDir }
}

export type PreparedVault = {
  readonly path: string
  readonly cleanup: () => Promise<void>
}

export const prepareVault = async (opts: {
  readonly vault: string
  readonly copy: boolean
  readonly plugin: { readonly id: string, readonly sourceDir: string }
}): Promise<PreparedVault> => {
  if (!await fileExists(opts.vault)) {
    throw new Error(`Vault not found: ${opts.vault}`)
  }

  const target = opts.copy
    ? await fs.mkdtemp(path.join(os.tmpdir(), 'obsidian-bases-charts-vault-'))
    : opts.vault

  if (opts.copy) {
    await fs.cp(opts.vault, target, { recursive: true })
  }

  const pluginDir = path.join(target, '.obsidian', 'plugins', opts.plugin.id)
  await fs.mkdir(pluginDir, { recursive: true })

  await Promise.all(PLUGIN_ARTIFACTS.map(async (file) => {
    const src = path.join(opts.plugin.sourceDir, file)
    if (!await fileExists(src)) {
      throw new Error(`Plugin artifact missing: ${src} — run \`bun run build\` first`)
    }
    await fs.cp(src, path.join(pluginDir, file))
  }))

  const cleanup = opts.copy
    ? (): Promise<void> => fs.rm(target, { recursive: true, force: true })
    : (): Promise<void> => Promise.resolve()

  return { path: target, cleanup }
}

export type LaunchOptions = {
  readonly binary: ObsidianBinary
  readonly vault: string
  readonly remoteDebuggingPort?: number
  readonly extraArgs?: readonly string[]
  readonly stdio?: 'pipe' | 'inherit'
}

export const launchObsidian = (opts: LaunchOptions): { readonly proc: ChildProcess } => {
  const portArg = opts.remoteDebuggingPort === undefined
    ? []
    : [`--remote-debugging-port=${opts.remoteDebuggingPort}`]
  const args = [
    opts.vault,
    '--no-sandbox',
    ...portArg,
    ...(opts.extraArgs ?? []),
  ]
  const proc = spawn(opts.binary.executable, args, { stdio: opts.stdio ?? 'inherit' })
  return { proc }
}
