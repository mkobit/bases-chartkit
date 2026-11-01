import { describe, expect, test } from 'bun:test'
import {
  connectCdp,
  fetchCdpTargets,
  findPageTarget,
} from '../e2e/cdp/client'
import type { CdpTarget } from '../e2e/cdp/client'

interface CapturedMouseEvent {
  readonly method: string
  readonly params: {
    readonly type: string
    readonly x: number
    readonly y: number
  }
}

interface CapturedKeyEvent {
  readonly method: string
  readonly params: {
    readonly type: string
    readonly key: string
  }
}

class MessageSink<T> {
  public message: T | null = null

  public record(msg: T): void {
    this.message = msg
  }
}

describe('Chrome DevTools Protocol target resolution', () => {
  test('finds page target among mixed target types', () => {
    const targets: readonly CdpTarget[] = [
      {
        id: '1',
        title: 'Background Service',
        type: 'service_worker',
        url: 'app://obsidian.md/worker.js',
        webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/1',
      },
      {
        id: '2',
        title: 'Obsidian Main Window',
        type: 'page',
        url: 'app://obsidian.md/index.html',
        webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/2',
      },
    ]

    const pageTarget = findPageTarget(targets)
    expect(pageTarget).toBeDefined()
    expect(pageTarget?.id).toBe('2')
    expect(pageTarget?.type).toBe('page')
  })

  test('returns undefined when no page target exists', () => {
    const targets: readonly CdpTarget[] = [
      {
        id: '1',
        title: 'Background Service',
        type: 'service_worker',
        url: 'app://obsidian.md/worker.js',
        webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/1',
      },
    ]

    const pageTarget = findPageTarget(targets)
    expect(pageTarget).toBeUndefined()
  })

  test('fetches targets from http endpoint', async () => {
    const mockTargets: readonly CdpTarget[] = [
      {
        id: 'test-1',
        title: 'Test Target',
        type: 'page',
        url: 'app://obsidian.md/index.html',
        webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/test-1',
      },
    ]

    const server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url)
        if (url.pathname === '/json/list') {
          return Response.json(mockTargets)
        }
        return new Response('Not found', { status: 404 })
      },
    })

    const port = server.port ?? 0
    try {
      const targets = await fetchCdpTargets(port)
      expect(targets).toHaveLength(1)
      expect(targets[0]?.id).toBe('test-1')
    }
    finally {
      await server.stop(true)
    }
  })

  test('rejects when http endpoint returns non-ok response', async () => {
    const server = Bun.serve({
      port: 0,
      fetch() {
        return new Response('Internal error', { status: 500, statusText: 'Server Error' })
      },
    })

    const port = server.port ?? 0
    try {
      expect(fetchCdpTargets(port)).rejects.toThrow('Failed to fetch CDP targets')
    }
    finally {
      await server.stop(true)
    }
  })

  test('rejects when http endpoint returns non-array payload', async () => {
    const server = Bun.serve({
      port: 0,
      fetch() {
        return Response.json({ error: 'not an array' })
      },
    })

    const port = server.port ?? 0
    try {
      expect(fetchCdpTargets(port)).rejects.toThrow('Invalid CDP response')
    }
    finally {
      await server.stop(true)
    }
  })
})

describe('Chrome DevTools Protocol client session', () => {
  test('sends commands and receives json-rpc results', async () => {
    const server = Bun.serve({
      port: 0,
      fetch(req, s) {
        if (s.upgrade(req)) {
          return undefined
        }
        return new Response('WebSocket upgrade required', { status: 400 })
      },
      websocket: {
        message(ws, message) {
          const raw = typeof message === 'string' ? message : ''
          const parsed = JSON.parse(raw)

          if (parsed.method === 'Custom.echo') {
            ws.send(JSON.stringify({
              id: parsed.id,
              result: { echo: parsed.params },
            }))
          }
        },
      },
    })

    try {
      const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
      const response = await client.send<{ readonly echo: { readonly value: number } }>('Custom.echo', { value: 42 })

      expect(response.echo.value).toBe(42)
      await client.close()
    }
    finally {
      await server.stop(true)
    }
  })

  test('evaluates javascript expressions in page context', async () => {
    const server = Bun.serve({
      port: 0,
      fetch(req, s) {
        if (s.upgrade(req)) {
          return undefined
        }
        return new Response('WebSocket upgrade required', { status: 400 })
      },
      websocket: {
        message(ws, message) {
          const raw = typeof message === 'string' ? message : ''
          const parsed = JSON.parse(raw)

          if (parsed.method === 'Runtime.evaluate') {
            ws.send(JSON.stringify({
              id: parsed.id,
              result: {
                result: {
                  type: 'string',
                  value: 'evaluation-result',
                },
              },
            }))
          }
        },
      },
    })

    try {
      const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
      const result = await client.evaluate<string>('window.title')

      expect(result).toBe('evaluation-result')
      await client.close()
    }
    finally {
      await server.stop(true)
    }
  })

  test('throws error on failed javascript evaluation', async () => {
    const server = Bun.serve({
      port: 0,
      fetch(req, s) {
        if (s.upgrade(req)) {
          return undefined
        }
        return new Response('WebSocket upgrade required', { status: 400 })
      },
      websocket: {
        message(ws, message) {
          const raw = typeof message === 'string' ? message : ''
          const parsed = JSON.parse(raw)

          if (parsed.method === 'Runtime.evaluate') {
            ws.send(JSON.stringify({
              id: parsed.id,
              result: {
                exceptionDetails: {
                  text: 'Uncaught ReferenceError',
                  exception: {
                    description: 'ReferenceError: invalidVariable is not defined',
                  },
                },
              },
            }))
          }
        },
      },
    })

    try {
      const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
      expect(client.evaluate('invalidVariable')).rejects.toThrow('ReferenceError: invalidVariable is not defined')
      await client.close()
    }
    finally {
      await server.stop(true)
    }
  })

  test('captures screenshots as buffer from base64 response', async () => {
    const base64Pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    const server = Bun.serve({
      port: 0,
      fetch(req, s) {
        if (s.upgrade(req)) {
          return undefined
        }
        return new Response('WebSocket upgrade required', { status: 400 })
      },
      websocket: {
        message(ws, message) {
          const raw = typeof message === 'string' ? message : ''
          const parsed = JSON.parse(raw)

          if (parsed.method === 'Page.captureScreenshot') {
            ws.send(JSON.stringify({
              id: parsed.id,
              result: {
                data: base64Pixel,
              },
            }))
          }
        },
      },
    })

    try {
      const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
      const buffer = await client.captureScreenshot({ format: 'png' })

      expect(buffer).toBeInstanceOf(Uint8Array)
      expect(buffer.length).toBeGreaterThan(0)
      await client.close()
    }
    finally {
      await server.stop(true)
    }
  })

  test('dispatches mouse events with parameters', async () => {
    const sink = new MessageSink<CapturedMouseEvent>()

    const server = Bun.serve({
      port: 0,
      fetch(req, s) {
        if (s.upgrade(req)) {
          return undefined
        }
        return new Response('WebSocket upgrade required', { status: 400 })
      },
      websocket: {
        message(ws, message) {
          const raw = typeof message === 'string' ? message : ''
          const parsed = JSON.parse(raw)
          sink.record(parsed)

          ws.send(JSON.stringify({
            id: parsed.id,
            result: {},
          }))
        },
      },
    })

    try {
      const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
      await client.dispatchMouseEvent({
        type: 'mouseMoved',
        x: 100,
        y: 200,
      })

      const msg = sink.message
      expect(msg).not.toBeNull()
      if (msg !== null) {
        expect(msg.method).toBe('Input.dispatchMouseEvent')
        expect(msg.params.type).toBe('mouseMoved')
        expect(msg.params.x).toBe(100)
        expect(msg.params.y).toBe(200)
      }

      await client.close()
    }
    finally {
      await server.stop(true)
    }
  })

  test('dispatches key events with parameters', async () => {
    const sink = new MessageSink<CapturedKeyEvent>()

    const server = Bun.serve({
      port: 0,
      fetch(req, s) {
        if (s.upgrade(req)) {
          return undefined
        }
        return new Response('WebSocket upgrade required', { status: 400 })
      },
      websocket: {
        message(ws, message) {
          const raw = typeof message === 'string' ? message : ''
          const parsed = JSON.parse(raw)
          sink.record(parsed)

          ws.send(JSON.stringify({
            id: parsed.id,
            result: {},
          }))
        },
      },
    })

    try {
      const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
      await client.dispatchKeyEvent({
        type: 'keyDown',
        key: 'Escape',
        code: 'Escape',
      })

      const msg = sink.message
      expect(msg).not.toBeNull()
      if (msg !== null) {
        expect(msg.method).toBe('Input.dispatchKeyEvent')
        expect(msg.params.type).toBe('keyDown')
        expect(msg.params.key).toBe('Escape')
      }

      await client.close()
    }
    finally {
      await server.stop(true)
    }
  })

  test('connects to numeric port and auto-discovers page target', async () => {
    let wsPort = 0

    const wsServer = Bun.serve({
      port: 0,
      fetch(req, s) {
        if (s.upgrade(req)) {
          return undefined
        }
        return new Response('WebSocket upgrade required', { status: 400 })
      },
      websocket: {
        message(ws, message) {
          const raw = typeof message === 'string' ? message : ''
          const parsed = JSON.parse(raw)
          ws.send(JSON.stringify({ id: parsed.id, result: { connected: true } }))
        },
      },
    })
    wsPort = wsServer.port ?? 0

    const httpServer = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url)
        if (url.pathname === '/json/list') {
          return Response.json([
            {
              id: 'page-1',
              title: 'Obsidian Window',
              type: 'page',
              url: 'app://obsidian.md/index.html',
              webSocketDebuggerUrl: `ws://127.0.0.1:${wsPort}`,
            },
          ])
        }
        return new Response('Not found', { status: 404 })
      },
    })

    const httpPort = httpServer.port ?? 0
    try {
      const client = await connectCdp(httpPort)
      const response = await client.send<{ readonly connected: boolean }>('Custom.test')
      expect(response.connected).toBe(true)
      await client.close()
    }
    finally {
      await httpServer.stop(true)
      await wsServer.stop(true)
    }
  })

  test('rejects pending requests when websocket closes prematurely', async () => {
    const server = Bun.serve({
      port: 0,
      fetch(req, s) {
        if (s.upgrade(req)) {
          return undefined
        }
        return new Response('WebSocket upgrade required', { status: 400 })
      },
      websocket: {
        message(ws) {
          // Close immediately without answering request
          ws.close()
        },
      },
    })

    try {
      const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
      expect(client.send('Test.neverResponds')).rejects.toThrow('closed')
    }
    finally {
      await server.stop(true)
    }
  })
})
