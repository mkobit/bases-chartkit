#!/usr/bin/env bun
// Capture a screenshot of the running `vault:dev` Obsidian window via CDP.
// Usage: bun scripts/vault-screenshot.ts [output-path]
// Default output: ./vault-screenshot-<timestamp>.png

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const CDP_PORT = 9222
const outputPath = process.argv[2] ?? path.join('.test-output', 'vault-screenshot.png')

interface CdpPage {
  readonly type: string
  readonly webSocketDebuggerUrl: string
}

interface CdpResponse {
  readonly id: number
  readonly result?: { readonly data?: string }
  readonly error?: { readonly message: string }
}

async function fetchPages(): Promise<readonly CdpPage[]> {
  const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data: readonly CdpPage[] = await r.json()
  return data
}

function captureViaWebsocket(wsUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    ws.addEventListener('error', () => {
      reject(new Error('ws error connecting to CDP'))
    })
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Page.captureScreenshot',
        params: { format: 'png' },
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
      const b64 = msg.result?.data
      if (!b64) {
        reject(new Error('no screenshot data in CDP response'))
        return
      }
      resolve(Buffer.from(b64, 'base64'))
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

  const png = await captureViaWebsocket(page.webSocketDebuggerUrl)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, png)
  console.log(`Screenshot written: ${outputPath} (${png.byteLength} bytes)`)
}

main().catch((err: unknown) => {
  console.error('Fatal error in vault-screenshot:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
