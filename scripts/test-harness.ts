#!/usr/bin/env bun
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

async function setupObsidianLinux() {
  const obsidianDir = path.join(process.cwd(), '.obsidian-bin')
  const appImage = path.join(obsidianDir, 'Obsidian.AppImage')
  const extractDir = path.join(obsidianDir, 'squashfs-root')
  const executablePath = path.join(extractDir, 'obsidian')

  if (!fs.existsSync(obsidianDir)) {
    fs.mkdirSync(obsidianDir, { recursive: true })
  }

  if (!fs.existsSync(appImage) || !fs.existsSync(executablePath)) {
    console.log('Downloading Obsidian AppImage...')
    execSync(`wget -q https://github.com/obsidianmd/obsidian-releases/releases/download/v1.7.7/Obsidian-1.7.7.AppImage -O ${appImage}`)
    execSync(`chmod +x ${appImage}`)

    console.log('Extracting AppImage...')
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true })
    }
    execSync(`cd ${obsidianDir} && ./Obsidian.AppImage --appimage-extract`)
  }

  process.env.OBSIDIAN_EXECUTABLE_PATH = executablePath

  const binDir = path.join(obsidianDir, 'bin')
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true })
  }
  const wrapperPath = path.join(binDir, 'obsidian')
  fs.writeFileSync(wrapperPath, `#!/bin/bash\nexec "${executablePath}" --disable-gpu --disable-dev-shm-usage --no-sandbox "$@"\n`)
  fs.chmodSync(wrapperPath, 0o755)

  process.env.PATH = `${binDir}:${process.env.PATH}`

  const configDir = path.join(os.homedir(), '.config', 'obsidian')
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }
  fs.writeFileSync(path.join(configDir, 'obsidian.json'), JSON.stringify({ cli: true, vaults: { 'dummy-vault-id': { path: process.cwd(), open: true, // eslint-disable-next-line no-restricted-globals
    ts: Date.now() } } }))

  console.log(`Obsidian executable ready at: ${executablePath}`)
}

async function main() {
  if (os.platform() === 'linux') {
    await setupObsidianLinux()
  }

  console.log('Running e2e tests...')
  try {
    if (os.platform() === 'linux') {
      execSync(`xvfb-run --auto-servernum --server-args="-screen 0 1280x1024x24" bun test ./e2e`, { stdio: 'inherit', env: { ...process.env, PATH: process.env.PATH } })
    }
    else {
      execSync(`bun test ./e2e`, { stdio: 'inherit', env: { ...process.env, PATH: process.env.PATH } })
    }
  }
  catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    error
    process.exit(1)
  }
  finally {
    if (os.platform() === 'linux') {
      try {
        execSync(`pkill -f obsidian || true`)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
      catch (_e) {}
      try {
        execSync(`pkill -f xvfb-run || true`)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
      catch (_e) {}
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
