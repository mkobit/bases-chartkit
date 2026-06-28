import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian } from './helpers/evaluate'
import { REGISTERED_CHART_VIEW_TYPES } from '../src/charts/registered-views'

test.describe('Bases view registration', () => {
  for (const viewType of REGISTERED_CHART_VIEW_TYPES) {
    test(`registers ${viewType} with the Bases core plugin`, async ({ obsidianPage: { page } }) => {
      const registered = await evaluateObsidian(page, (app, args: { viewType: string }) => {
        const registrations = app.internalPlugins.plugins.bases?.instance?.registrations
        return registrations !== undefined && args.viewType in registrations
      }, { viewType })

      expect(registered).toBe(true)
    })
  }
})
