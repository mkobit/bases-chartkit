import { test, expect } from './fixtures/obsidian'

// Regression test for the obsidianPage fixture's theme option (bck-frm):
// test.use({ theme: 'dark' | 'light' }) must actually reach Obsidian's own
// color scheme before launch, not just write a file that's never read.
// Obsidian's core theming toggles a 'theme-dark'/'theme-light' class on
// <body> for the two built-in base themes -- the same signal community
// themes and snippets rely on -- so reading it here is a direct check of
// Obsidian's own applied state, not incidental rendered markup.
test.describe('obsidianPage theme fixture', () => {
  test.describe('theme: dark', () => {
    test.use({ theme: 'dark' })

    test('launches with the dark color scheme applied', async ({ obsidianPage: { page } }) => {
      const bodyClasses = await page.evaluate(() => document.body.className)
      expect(bodyClasses).toContain('theme-dark')
      expect(bodyClasses).not.toContain('theme-light')
    })
  })

  test.describe('theme: light', () => {
    test.use({ theme: 'light' })

    test('launches with the light color scheme applied', async ({ obsidianPage: { page } }) => {
      const bodyClasses = await page.evaluate(() => document.body.className)
      expect(bodyClasses).toContain('theme-light')
      expect(bodyClasses).not.toContain('theme-dark')
    })
  })
})
