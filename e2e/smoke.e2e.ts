import { test, expect } from './fixtures/obsidian'

import { evaluateObsidian, evaluateObsidianWith } from './helpers/evaluate'
import type { App } from 'obsidian'

test.describe('Obsidian Bases Charts Plugin', () => {
  test('should launch Obsidian and load the plugin', async ({ obsidianPage: { page } }) => {
    // Verify the plugin is loaded in the internal registry
    const isLoaded = await evaluateObsidian(page, (app: App) => {
      // 'plugins' is not in the public API but exists at runtime
      const internalApp = app as unknown as { plugins: { plugins: Record<string, unknown> } }
      return internalApp.plugins.plugins['obsidian-bases-charts'] !== undefined
    })
    expect(isLoaded).toBe(true)
  })

  test('should register the settings tab', async ({ obsidianPage: { page } }) => {
    // Verify that the plugin registered its settings tab
    const hasSettingsTab = await evaluateObsidian(page, (app: App) => {
      // 'setting' is internal
      const internalApp = app as unknown as { setting: { pluginTabs: { id: string }[] } }
      return internalApp.setting.pluginTabs.some(t => t.id === 'obsidian-bases-charts')
    })
    expect(hasSettingsTab).toBe(true)
  })

  test('should be able to create a file in the vault', async ({ obsidianPage: { page } }) => {
    // Demonstrate best practice: interacting with the vault directly
    const filename = 'test-chart.md'
    const content = '```chart\n\n```'

    // Create file
    await evaluateObsidianWith(page, async (app: App, args: { filename: string, content: string }) => {
      const existing = app.vault.getAbstractFileByPath(args.filename)
      if (existing) {
        await app.fileManager.trashFile(existing)
      }
      await app.vault.create(args.filename, args.content)
    }, { filename, content })

    // Verify it exists via internal API
    const fileExists = await evaluateObsidianWith(page, (app: App, args: { filename: string }) => {
      return app.vault.getAbstractFileByPath(args.filename) !== null
    }, { filename })

    expect(fileExists).toBe(true)
  })
})
