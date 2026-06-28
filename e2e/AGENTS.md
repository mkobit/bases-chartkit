# E2E Testing (Playwright)

## Core Strategy
**Avoid UI Scraping**: Use `evaluateObsidian` to interact with the internal Obsidian API for robust state verification.

```typescript
// Good: Verify file existence via internal API
const exists = await evaluateObsidian(page, (app) => {
  return app.vault.getAbstractFileByPath("MyFile.md") !== null;
});
```

## Context Isolation
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
