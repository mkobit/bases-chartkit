import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

// Separate config for the doc-screenshot survey tool so its spec (matched via
// the `.survey.ts` extension, not `.e2e.ts`) never gets picked up by the
// default `bun run test:e2e` glob.
export default defineConfig(baseConfig, {
  testMatch: '**/*.survey.ts',
  // The whole vault sweep runs as a single test (one Obsidian launch, ~36
  // sequential view renders) -- the base config's 120s timeout is sized for
  // one-view-per-test e2e specs and is far too short here.
  timeout: 30 * 60_000,
  // A manual dev tool, not a CI gate: retrying the entire 30-minute sweep on
  // failure just doubles the wait for no benefit.
  retries: 0,
})
