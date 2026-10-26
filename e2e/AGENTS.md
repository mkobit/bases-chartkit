# E2E testing (Playwright)

## Core strategy
**Avoid UI Scraping**: Use `evaluateObsidian` to interact with the internal Obsidian API for robust state verification.

```typescript
// Good: Verify file existence via internal API
const exists = await evaluateObsidian(page, (app) => {
  return app.vault.getAbstractFileByPath("MyFile.md") !== null;
});
```

## Context isolation
Variables from the test scope are **not** available inside `evaluateObsidian` — the function is serialized via `.toString()` and re-evaluated in the renderer. Pass everything explicitly as the third argument.

```typescript
const filename = "note.md";
await evaluateObsidian(page, async (app, args: { filename: string }) => {
  // 'args.filename' is available here, 'filename' is NOT
  await app.vault.create(args.filename, "");
}, { filename });
```

## Typing internal Obsidian APIs
`e2e/obsidian-internal.d.ts` augments `App` with internal members used by e2e tests (`app.plugins`, `app.setting`, `app.internalPlugins`). When a new test needs a different internal API, add it there — don't use `as unknown as` casts (the e2e lint rule blocks them).

## Screenshot survey verification
`e2e/survey/chart-types.survey.ts` captures screenshots for all chart views into `docs/images/chart-types/`.
Programmatic checks cannot verify that rendered visuals match visual requirements.
Review every changed screenshot visually or with `scripts/compare-screenshots.ts` before committing.
See the screenshot review process in [AGENTS.md](../AGENTS.md#screenshot-review-process).
