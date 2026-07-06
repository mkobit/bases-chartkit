import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian } from './helpers/evaluate'
import { REGISTERED_CHART_VIEW_TYPES } from '../src/charts/registered-views'

test.describe('Bases view registration', () => {
  test('registers all view types with the Bases core plugin', async ({ obsidianPage: { page } }) => {
    await expect.poll(async () => {
      return await evaluateObsidian(page, (app, args: { viewTypes: readonly string[] }) => {
        const registrations = app.internalPlugins.plugins.bases?.instance?.registrations
        return registrations !== undefined && args.viewTypes.every(viewType => viewType in registrations)
      }, { viewTypes: REGISTERED_CHART_VIEW_TYPES })
    }, {
      message: 'All chart view types should be registered with the Bases core plugin',
      timeout: 15_000,
    }).toBe(true)
  })
})
