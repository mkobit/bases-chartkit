import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { evalInObsidian } from 'obsidian-integration-testing'
import { setupVault, teardownVault, globalVault } from './setup'
import type { App } from 'obsidian'

describe('Obsidian Bases Charts Plugin', () => {
  beforeAll(async () => {
    await setupVault()

    await evalInObsidian({
      vaultPath: globalVault.path,
      args: { pluginId: 'obsidian-bases-charts' },
      fn: async ({ app, pluginId }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plugins = (app as any).plugins

        await plugins.enablePlugin(pluginId)
      },
    })
  })

  afterAll(async () => {
    await teardownVault()
  })

  it('should be loaded in the internal registry', async () => {
    const isLoaded = await evalInObsidian({
      vaultPath: globalVault.path,
      fn: ({ app }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (app as any).plugins.plugins['obsidian-bases-charts'] !== undefined
      },
    })
    expect(isLoaded).toBe(true)
  })

  it('should register the settings tab', async () => {
    const isRegistered = await evalInObsidian({
      vaultPath: globalVault.path,
      fn: ({ app }) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
        return (app as any).setting.pluginTabs.some((t: { id: string }) => t.id === 'obsidian-bases-charts')
      },
    })
    expect(isRegistered).toBe(true)
  })

  it('should be able to create a file in the vault', async () => {
    const filename = 'test-chart.md'
    const content = '```chart\n\n```'

    await evalInObsidian({
      vaultPath: globalVault.path,
      args: { filename, content },
      fn: async ({ app, filename, content }) => {
        const typedApp = app as unknown as App
        const existing = typedApp.vault.getAbstractFileByPath(filename)
        if (existing) {
          await typedApp.fileManager.trashFile(existing)
        }
        await typedApp.vault.create(filename, content)
      },
    })

    const exists = await evalInObsidian({
      vaultPath: globalVault.path,
      args: { filename },
      fn: ({ app, filename }) => {
        const typedApp = app as unknown as App
        return typedApp.vault.getAbstractFileByPath(filename) !== null
      },
    })
    expect(exists).toBe(true)
  })
})
