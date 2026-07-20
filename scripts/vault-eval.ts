#!/usr/bin/env bun
// Evaluate JS in the running `vault:dev` Obsidian via CDP.
// Usage: bun scripts/vault-eval.ts '<js expression or IIFE>'
//
// Uses bun's built-in WebSocket + fetch — no external CDP library. Connects
// to the Obsidian Electron renderer exposed at CDP_PORT (set by vault:dev).

const CDP_PORT = 9222
const code = process.argv[2]

if (!code) {
  console.error('Usage: bun scripts/vault-eval.ts \'<js expression>\'')
  console.error('  e.g. bun scripts/vault-eval.ts \'app.vault.getName()\'')
  process.exit(1)
}

interface CdpPage {
  readonly type: string
  readonly webSocketDebuggerUrl: string
}

interface CdpResponse {
  readonly id: number
  readonly result?: {
    readonly result?: { readonly value?: unknown }
    readonly exceptionDetails?: unknown
  }
  readonly error?: { readonly message: string }
}

async function fetchPages(): Promise<readonly CdpPage[]> {
  const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- fetch().json() is untyped; CDP response shape is trusted here
  const data: readonly CdpPage[] = await r.json()
  return data
}

function evaluateOverWebsocket(wsUrl: string, expression: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    ws.addEventListener('error', () => {
      reject(new Error('ws error connecting to CDP'))
    })
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression, awaitPromise: true, returnByValue: true },
      }))
    })
    ws.addEventListener('message', (event) => {
      const raw: unknown = typeof event.data === 'string' ? event.data : ''
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- JSON.parse is untyped; CDP response shape is trusted here
      const msg: CdpResponse = JSON.parse(String(raw))
      if (msg.id !== 1) {
        return
      }
      ws.close()
      if (msg.error) {
        reject(new Error(msg.error.message))
        return
      }
      if (msg.result?.exceptionDetails) {
        reject(new Error(`evaluate threw: ${JSON.stringify(msg.result.exceptionDetails)}`))
        return
      }
      resolve(msg.result?.result?.value)
    })
  })
}

async function main(): Promise<void> {
  const pages = await fetchPages()
  const page = pages.find(p => p.type === 'page')
  if (!page) {
    console.error('No Obsidian page found at CDP — is `bun run vault:dev` running?')
    process.exit(1)
  }

  const wrapped = `(async () => { const app = activeWindow.app; return await (${code}); })()`
  const value = await evaluateOverWebsocket(page.webSocketDebuggerUrl, wrapped)
  console.log(JSON.stringify(value, null, 2))
}

main().catch((err: unknown) => {
  console.error('Fatal error in vault-eval:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
