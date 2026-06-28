import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian } from './helpers/evaluate'

const PLUGIN_ID = 'obsidian-bases-charts'

test.describe('plugin lifecycle', () => {
  test('loads into the plugin registry', async ({ obsidianPage: { page } }) => {
    await expect.poll(async () =>
      evaluateObsidian(
        page,
        (app, args: { pluginId: string }) => app.plugins.plugins[args.pluginId] !== undefined,
        { pluginId: PLUGIN_ID },
      ),
    ).toBe(true)
  })

  test('registers a settings tab', async ({ obsidianPage: { page } }) => {
    await expect.poll(async () =>
      evaluateObsidian(
        page,
        (app, args: { pluginId: string }) => app.setting.pluginTabs.some(t => t.id === args.pluginId),
        { pluginId: PLUGIN_ID },
      ),
    ).toBe(true)
  })

  test('can create a markdown file in the vault', async ({ obsidianPage: { page } }) => {
    const filename = 'test-chart.md'

    await evaluateObsidian(page, async (app, args: { filename: string }) => {
      const existing = app.vault.getAbstractFileByPath(args.filename)
      if (existing) {
        await app.fileManager.trashFile(existing)
      }
      await app.vault.create(args.filename, '```chart\n\n```')
    }, { filename })

    await expect.poll(async () =>
      evaluateObsidian(
        page,
        (app, args: { filename: string }) => app.vault.getAbstractFileByPath(args.filename) !== null,
        { filename },
      ),
    ).toBe(true)

    // cleanup
    await evaluateObsidian(page, async (app, args: { filename: string }) => {
      const f = app.vault.getAbstractFileByPath(args.filename)
      if (f) {
        await app.fileManager.trashFile(f)
      }
    }, { filename })
  })
})
