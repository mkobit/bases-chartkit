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
Variables from the test scope are **not** available inside `evaluateObsidian`. Pass them explicitly as arguments using `evaluateObsidianWith`.

```typescript
const filename = "note.md";
await evaluateObsidianWith(page, async (app, args) => {
  // 'args.filename' is available here, 'filename' is NOT
  await app.vault.create(args.filename, "");
}, { filename });
```
