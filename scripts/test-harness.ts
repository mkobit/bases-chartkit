#!/usr/bin/env bun
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

async function setupObsidianLinux() {
  const obsidianDir = path.join(process.cwd(), '.obsidian-bin')
  const appImage = path.join(obsidianDir, 'Obsidian.AppImage')

  if (!fs.existsSync(obsidianDir)) {
    fs.mkdirSync(obsidianDir, { recursive: true })
  }

  if (!fs.existsSync(appImage)) {
    console.log('Downloading Obsidian AppImage...')
    execSync(`wget -q https://github.com/obsidianmd/obsidian-releases/releases/download/v1.5.8/Obsidian-1.5.8.AppImage -O ${appImage}`)
    execSync(`chmod +x ${appImage}`)
  }

  const extractDir = path.join(obsidianDir, 'squashfs-root')
  if (!fs.existsSync(extractDir)) {
    console.log('Extracting AppImage...')
    execSync(`cd ${obsidianDir} && ./Obsidian.AppImage --appimage-extract`)
  }

  process.env.OBSIDIAN_EXECUTABLE_PATH = path.join(extractDir, 'obsidian')
  console.log(`Obsidian executable ready at: ${process.env.OBSIDIAN_EXECUTABLE_PATH}`)
}

async function main() {
  if (os.platform() === 'linux') {
    await setupObsidianLinux()
  }

  console.log('Running playwright tests...')
  try {
    if (os.platform() === 'linux') {
      execSync(`xvfb-run --auto-servernum --server-args="-screen 0 1280x1024x24" npx playwright test`, { stdio: 'inherit' })
    }
    else {
      execSync(`npx playwright test`, { stdio: 'inherit' })
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch (error) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
