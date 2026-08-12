import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian } from './helpers/evaluate'

// See theme-fixture-dark.e2e.ts for why this is a separate file rather than
// a nested describe: theme is a worker-scoped fixture option.
test.use({ theme: 'light' })

test.describe('obsidianPage theme fixture', () => {
  test('launches with the light color scheme applied', async ({ obsidianPage: { page } }) => {
    const isDark = await evaluateObsidian(page, () => document.body.classList.contains('theme-dark'))
    const isLight = await evaluateObsidian(page, () => document.body.classList.contains('theme-light'))
    expect(isDark).toBe(false)
    expect(isLight).toBe(true)
  })
})
