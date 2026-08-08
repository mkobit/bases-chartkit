#!/usr/bin/env bun
// Evaluate JS in the running `vault:dev` Obsidian via Obsidian's official CLI
// (https://obsidian.md/help/cli). Usage: bun scripts/vault-eval.ts '<js expression>'
//
// Code must be an expression that evaluates to (or returns) the value you
// want, e.g. `app.vault.getFiles().length` or `app.vault.read(someFile)`.
// The CLI awaits a returned promise for you, but a bare `await` keyword
// isn't valid here -- it runs as a classic `eval()`, not inside an async
// function -- so pass the promise-returning expression itself, not an
// `await`-prefixed one.

import { runObsidianCli } from './obsidian-cli'

const code = process.argv[2]

if (!code) {
  console.error('Usage: bun scripts/vault-eval.ts \'<js expression>\'')
  console.error('  e.g. bun scripts/vault-eval.ts \'app.vault.getName()\'')
  process.exit(1)
}

async function main(): Promise<void> {
  const { stdout, stderr, exitCode } = await runObsidianCli(['eval', `code=${code}`])
  if (exitCode !== 0) {
    console.error(stderr || 'obsidian-cli eval failed — is `bun run vault:dev` running?')
    process.exit(exitCode)
  }
  console.log(stdout)
}

main().catch((err: unknown) => {
  console.error('Fatal error in vault-eval:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
