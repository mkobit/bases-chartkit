#!/usr/bin/env bun
// Refresh the plugin in the running `vault:dev` Obsidian without restarting.
// Copies the freshly-built main.js/manifest.json/styles.css into the live
// vault's plugin directory, then disables + re-enables the plugin via CDP so
// Obsidian picks up the new bundle.
//
// Iteration loop: `bun run dev` (esbuild watch) → edit → `bun run vault:reload`

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const CDP_PORT = 9222
const PLUGIN_ID = 'obsidian-bases-charts'
const PLUGIN_ARTIFACTS = ['main.js', 'manifest.json', 'styles.css'] as const
const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const VAULT_PATH = path.join(ROOT_DIR, 'obsidian-bases-charts-example-vault')

interface CdpPage {
  readonly type: string
  readonly webSocketDebuggerUrl: string
}

interface CdpResponse {
  readonly id: number
  readonly result?: { readonly exceptionDetails?: unknown }
  readonly error?: { readonly message: string }
}

async function fetchPages(): Promise<readonly CdpPage[]> {
  const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data: readonly CdpPage[] = await r.json()
  return data
}

function evaluate(wsUrl: string, expression: string): Promise<void> {
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
      resolve()
    })
  })
}

async function main(): Promise<void> {
  // Copy fresh artifacts in
  const pluginDir = path.join(VAULT_PATH, '.obsidian', 'plugins', PLUGIN_ID)
  await fs.mkdir(pluginDir, { recursive: true })
  await Promise.all(PLUGIN_ARTIFACTS.map(async (f) => {
    const src = path.join(ROOT_DIR, f)
    try {
      await fs.access(src)
    }
    catch {
      console.error(`Missing ${f} at repo root — run \`bun run build\` or \`bun run dev\` first`)
      process.exit(1)
    }
    await fs.cp(src, path.join(pluginDir, f))
  }))

  // Reload via CDP
  const pages = await fetchPages()
  const page = pages.find(p => p.type === 'page')
  if (!page) {
    console.error('No Obsidian page found at CDP — is `bun run vault:dev` running?')
    process.exit(1)
  }
  await evaluate(
    page.webSocketDebuggerUrl,
    `(async () => {
      await app.plugins.disablePlugin('${PLUGIN_ID}');
      await app.plugins.enablePlugin('${PLUGIN_ID}');
    })()`,
  )
  console.log(`Reloaded ${PLUGIN_ID}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
