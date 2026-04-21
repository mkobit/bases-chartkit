import { TempVault } from 'obsidian-integration-testing'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'

export let globalVault: TempVault

export async function setupVault() {
  globalVault = new TempVault()

  const rootDir = path.resolve(import.meta.dirname, '../')
  const mainJs = await fs.readFile(path.join(rootDir, 'main.js'), 'utf-8')
  const manifestJson = await fs.readFile(path.join(rootDir, 'manifest.json'), 'utf-8')
  let stylesCss = ''
  try {
    stylesCss = await fs.readFile(path.join(rootDir, 'styles.css'), 'utf-8')
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
  catch (_e) {}

  globalVault.populate({
    // eslint-disable-next-line obsidianmd/hardcoded-config-path
    '.obsidian/plugins/obsidian-bases-charts/main.js': mainJs,
    // eslint-disable-next-line obsidianmd/hardcoded-config-path
    '.obsidian/plugins/obsidian-bases-charts/manifest.json': manifestJson,
    // eslint-disable-next-line obsidianmd/hardcoded-config-path
    '.obsidian/plugins/obsidian-bases-charts/styles.css': stylesCss,
  })

  await globalVault.register()

  return globalVault
}

export async function teardownVault() {
  if (globalVault) {
    await globalVault.dispose()
  }
}
