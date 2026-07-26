import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian } from './helpers/evaluate'

// Regression test for the obsidianPage fixture's theme option:
// test.use({ theme: 'dark' | 'light' }) must actually reach Obsidian's own
// color scheme before launch, not just write a file that's never read.
// Obsidian's core theming toggles a 'theme-dark'/'theme-light' class on
// <body> for the two built-in base themes -- src/views/base-chart-view.ts's
// own isDarkMode() reads this exact class, so checking it here verifies the
// same signal the plugin itself depends on, not incidental rendered markup.
test.describe('obsidianPage theme fixture', () => {
  test.describe('theme: dark', () => {
    test.use({ theme: 'dark' })

    test('launches with the dark color scheme applied', async ({ obsidianPage: { page } }) => {
      const isDark = await evaluateObsidian(page, () => document.body.classList.contains('theme-dark'))
      const isLight = await evaluateObsidian(page, () => document.body.classList.contains('theme-light'))
      expect(isDark).toBe(true)
      expect(isLight).toBe(false)
    })
  })

  test.describe('theme: light', () => {
    test.use({ theme: 'light' })

    test('launches with the light color scheme applied', async ({ obsidianPage: { page } }) => {
      const isDark = await evaluateObsidian(page, () => document.body.classList.contains('theme-dark'))
      const isLight = await evaluateObsidian(page, () => document.body.classList.contains('theme-light'))
      expect(isDark).toBe(false)
      expect(isLight).toBe(true)
    })
  })
})
