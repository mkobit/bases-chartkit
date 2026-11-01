/**
 * Chrome DevTools Protocol client for end-to-end tests.
 * Connects to Obsidian over WebSocket and sends JSON-RPC commands.
 */

export interface CdpTarget {
  readonly description?: string
  readonly devtoolsFrontendUrl?: string
  readonly id: string
  readonly title: string
  readonly type: string
  readonly url: string
  readonly webSocketDebuggerUrl: string
}

export interface ViewportClip {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly scale?: number
}

export interface ScreenshotOptions {
  readonly format?: 'png' | 'jpeg'
  readonly quality?: number
  readonly clip?: ViewportClip
}

export type MouseEventType = 'mousePressed' | 'mouseReleased' | 'mouseMoved' | 'mouseWheel'
export type MouseButton = 'none' | 'left' | 'middle' | 'right'

export interface MouseEventParams {
  readonly type: MouseEventType
  readonly x: number
  readonly y: number
  readonly button?: MouseButton
  readonly clickCount?: number
  readonly deltaX?: number
  readonly deltaY?: number
  readonly modifiers?: number
}

export type KeyEventType = 'keyDown' | 'keyUp' | 'rawKeyDown' | 'char'

export interface KeyEventParams {
  readonly type: KeyEventType
  readonly key?: string
  readonly code?: string
  readonly text?: string
  readonly unmodifiedText?: string
  readonly windowsVirtualKeyCode?: number
  readonly nativeVirtualKeyCode?: number
  readonly macCharCode?: number
}

export interface CdpClient {
  readonly wsUrl: string
  readonly send: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>
  readonly evaluate: <T = unknown>(expression: string) => Promise<T>
  readonly captureScreenshot: (options?: ScreenshotOptions) => Promise<Buffer>
  readonly dispatchMouseEvent: (params: MouseEventParams) => Promise<void>
  readonly dispatchKeyEvent: (params: KeyEventParams) => Promise<void>
  readonly close: () => Promise<void>
}

interface PendingRequest {
  readonly resolve: (value: unknown) => void
  readonly reject: (reason: Error) => void
}

interface JsonRpcMessage {
  readonly id?: number
  readonly method?: string
  readonly params?: Record<string, unknown>
  readonly result?: unknown
  readonly error?: {
    readonly code?: number
    readonly message: string
    readonly data?: unknown
  }
}

interface RuntimeEvaluateResponse {
  readonly result?: {
    readonly type?: string
    readonly value?: unknown
    readonly description?: string
  }
  readonly exceptionDetails?: {
    readonly text?: string
    readonly exception?: {
      readonly description?: string
      readonly value?: unknown
    }
  }
}

interface ScreenshotResponse {
  readonly data: string
}

export class CdpClientSession implements CdpClient {
  public readonly wsUrl: string
  private readonly ws: WebSocket
  private nextId: number = 1
  private readonly pendingRequests: Map<number, PendingRequest> = new Map()

  public constructor(ws: WebSocket, wsUrl: string) {
    this.ws = ws
    this.wsUrl = wsUrl

    this.ws.addEventListener('message', (event) => {
      this.handleMessage(event.data)
    })

    this.ws.addEventListener('close', () => {
      this.handleClose()
    })
  }

  public async send<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    const id = this.nextId
    this.nextId += 1

    const payload = JSON.stringify({
      id,
      method,
      ...(params !== undefined ? { params } : {}),
    })

    return new Promise<T>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- store callback for json-rpc response resolution
      this.pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject })
      this.ws.send(payload)
    })
  }

  public async evaluate<T = unknown>(expression: string): Promise<T> {
    const response = await this.send<RuntimeEvaluateResponse>('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })

    if (response.exceptionDetails !== undefined) {
      const description = response.exceptionDetails.exception?.description
      const message = description ?? response.exceptionDetails.text ?? 'Script evaluation failed'
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain new Error(...); pre-existing false positive, see e2e/fixtures/obsidian.ts.
      throw new Error(message)
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- bridge cdp runtime value to requested return type
    return response.result?.value as T
  }

  public async captureScreenshot(options?: ScreenshotOptions): Promise<Buffer> {
    const response = await this.send<ScreenshotResponse>('Page.captureScreenshot', {
      format: options?.format ?? 'png',
      ...(options?.quality !== undefined ? { quality: options.quality } : {}),
      ...(options?.clip !== undefined ? { clip: options.clip } : {}),
    })

    return Buffer.from(response.data, 'base64')
  }

  public async dispatchMouseEvent(params: MouseEventParams): Promise<void> {
    await this.send<Record<string, never>>('Input.dispatchMouseEvent', {
      type: params.type,
      x: params.x,
      y: params.y,
      ...(params.button !== undefined ? { button: params.button } : {}),
      ...(params.clickCount !== undefined ? { clickCount: params.clickCount } : {}),
      ...(params.deltaX !== undefined ? { deltaX: params.deltaX } : {}),
      ...(params.deltaY !== undefined ? { deltaY: params.deltaY } : {}),
      ...(params.modifiers !== undefined ? { modifiers: params.modifiers } : {}),
    })
  }

  public async dispatchKeyEvent(params: KeyEventParams): Promise<void> {
    await this.send<Record<string, never>>('Input.dispatchKeyEvent', {
      type: params.type,
      ...(params.key !== undefined ? { key: params.key } : {}),
      ...(params.code !== undefined ? { code: params.code } : {}),
      ...(params.text !== undefined ? { text: params.text } : {}),
      ...(params.unmodifiedText !== undefined ? { unmodifiedText: params.unmodifiedText } : {}),
      ...(params.windowsVirtualKeyCode !== undefined ? { windowsVirtualKeyCode: params.windowsVirtualKeyCode } : {}),
      ...(params.nativeVirtualKeyCode !== undefined ? { nativeVirtualKeyCode: params.nativeVirtualKeyCode } : {}),
      ...(params.macCharCode !== undefined ? { macCharCode: params.macCharCode } : {}),
    })
  }

  public async close(): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close()
    }
  }

  private handleMessage(data: unknown): void {
    const raw = typeof data === 'string' ? data : ''
    if (raw === '') {
      return
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- parse json-rpc message payload
    const parsed = JSON.parse(raw) as JsonRpcMessage
    if (parsed.id === undefined) {
      return
    }

    const pending = this.pendingRequests.get(parsed.id)
    if (pending === undefined) {
      return
    }

    this.pendingRequests.delete(parsed.id)

    if (parsed.error !== undefined) {
      pending.reject(new Error(parsed.error.message))
      return
    }

    pending.resolve(parsed.result)
  }

  private handleClose(): void {
    const remainingRequests = Array.from(this.pendingRequests.values())
    this.pendingRequests.clear()
    remainingRequests.forEach((req) => {
      req.reject(new Error('WebSocket connection closed before response'))
    })
  }
}

/**
 * Fetches Chrome DevTools Protocol targets from the specified HTTP port.
 */
export async function fetchCdpTargets(port: number): Promise<readonly CdpTarget[]> {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`)
  if (!response.ok) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain new Error(...); pre-existing false positive, see e2e/fixtures/obsidian.ts.
    throw new Error(`Failed to fetch CDP targets from port ${port}: ${response.statusText}`)
  }

  const raw: unknown = await response.json()
  if (!Array.isArray(raw)) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain new Error(...); pre-existing false positive, see e2e/fixtures/obsidian.ts.
    throw new Error(`Invalid CDP response from port ${port}: expected array`)
  }

  return raw.filter((item): item is CdpTarget => typeof item === 'object' && item !== null && 'id' in item && 'type' in item && 'webSocketDebuggerUrl' in item)
}

/**
 * Finds the page target representing the primary Obsidian window.
 */
export function findPageTarget(targets: readonly CdpTarget[]): CdpTarget | undefined {
  return targets.find(target => target.type === 'page')
}

/**
 * Connects to a Chrome DevTools Protocol endpoint.
 * Accepts either a numeric debugging port or a WebSocket URL string.
 */
export async function connectCdp(target: string | number): Promise<CdpClient> {
  const wsUrl = typeof target === 'number'
    ? await (async () => {
        const targets = await fetchCdpTargets(target)
        const page = findPageTarget(targets)
        if (page === undefined) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain new Error(...); pre-existing false positive, see e2e/fixtures/obsidian.ts.
          throw new Error(`No page target found on CDP port ${target}`)
        }
        return page.webSocketDebuggerUrl
      })()
    : target

  return new Promise<CdpClient>((resolve, reject) => {
    const ws = new WebSocket(wsUrl)

    const onOpen = (): void => {
      ws.removeEventListener('open', onOpen)
      ws.removeEventListener('error', onError)
      resolve(new CdpClientSession(ws, wsUrl))
    }

    const onError = (event: unknown): void => {
      ws.removeEventListener('open', onOpen)
      ws.removeEventListener('error', onError)

      reject(new Error(`Failed to connect to CDP WebSocket at ${wsUrl}: ${String(event)}`))
    }

    ws.addEventListener('open', onOpen)
    ws.addEventListener('error', onError)
  })
}
