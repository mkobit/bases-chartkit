import { describe, expect, test } from 'bun:test'
import * as childProcess from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  filterTestFiles,
  findFreePort,
  isDarkFixture,
  isLightFixture,
  isStandardTest,
  parseCliArgs,
  planTestSuites,
  runBunTest,
  runOrchestrator,
  stopObsidian,
  terminateOnSignal,
  waitForCdpReady,
} from '../scripts/run-e2e'
import type { TestSuite } from '../scripts/run-e2e'

describe('Command line argument parsing', () => {
  test('parses default options when empty array provided', () => {
    const result = parseCliArgs([])
    expect(result.suite).toBeUndefined()
    expect(result.fileFilters).toEqual([])
    expect(result.passthroughArgs).toEqual([])
    expect(result.showHelp).toBe(false)
  })

  test('parses --suite flag with valid suite names', () => {
    expect(parseCliArgs(['--suite', 'standard']).suite).toBe('standard')
    expect(parseCliArgs(['--suite', 'light']).suite).toBe('light')
    expect(parseCliArgs(['--suite', 'dark']).suite).toBe('dark')
    expect(parseCliArgs(['--suite', 'all']).suite).toBe('all')
  })

  test('parses -s shorthand and inline assignment', () => {
    expect(parseCliArgs(['-s', 'standard']).suite).toBe('standard')
    expect(parseCliArgs(['--suite=light']).suite).toBe('light')
    expect(parseCliArgs(['-s=dark']).suite).toBe('dark')
  })

  test('parses --theme flag as suite alias', () => {
    expect(parseCliArgs(['--theme', 'light']).suite).toBe('light')
    expect(parseCliArgs(['--theme', 'dark']).suite).toBe('dark')
    expect(parseCliArgs(['--theme=light']).suite).toBe('light')
  })

  test('parses help flags', () => {
    expect(parseCliArgs(['--help']).showHelp).toBe(true)
    expect(parseCliArgs(['-h']).showHelp).toBe(true)
  })

  test('parses file paths and patterns into fileFilters', () => {
    const result = parseCliArgs(['e2e/pie-chart-rendering.e2e.ts', 'bar-chart'])
    expect(result.fileFilters).toEqual(['e2e/pie-chart-rendering.e2e.ts', 'bar-chart'])
  })

  test('handles double dash separator', () => {
    const result = parseCliArgs(['--', 'e2e/smoke.e2e.ts', '--bail'])
    expect(result.fileFilters).toEqual(['e2e/smoke.e2e.ts'])
    expect(result.passthroughArgs).toEqual(['--bail'])
  })

  test('collects passthrough flags for bun test', () => {
    const result = parseCliArgs([
      '--timeout',
      '30000',
      '--bail',
      '-t',
      'donut chart',
      'e2e/pie-chart-rendering.e2e.ts',
    ])
    expect(result.suite).toBeUndefined()
    expect(result.fileFilters).toEqual(['e2e/pie-chart-rendering.e2e.ts'])
    expect(result.passthroughArgs).toEqual(['--timeout', '30000', '--bail', '-t', 'donut chart'])
  })

  test('throws error on invalid suite name', () => {
    expect(() => parseCliArgs(['--suite', 'invalid'])).toThrow(
      '--suite must be "standard", "light", "dark", or "all"',
    )
  })

  test('throws error on invalid theme name', () => {
    expect(() => parseCliArgs(['--theme', 'sepia'])).toThrow(
      '--theme must be "light" or "dark"',
    )
  })
})

describe('Test file classification and suite planning', () => {
  const sampleFiles = [
    'e2e/area-chart-rendering.e2e.ts',
    'e2e/pie-chart-rendering.e2e.ts',
    'e2e/theme-fixture-light.e2e.ts',
    'e2e/theme-fixture-dark.e2e.ts',
  ]

  test('classifies fixture and standard tests', () => {
    expect(isLightFixture('e2e/theme-fixture-light.e2e.ts')).toBe(true)
    expect(isLightFixture('e2e/theme-fixture-dark.e2e.ts')).toBe(false)
    expect(isDarkFixture('e2e/theme-fixture-dark.e2e.ts')).toBe(true)
    expect(isDarkFixture('e2e/pie-chart-rendering.e2e.ts')).toBe(false)
    expect(isStandardTest('e2e/pie-chart-rendering.e2e.ts')).toBe(true)
    expect(isStandardTest('e2e/theme-fixture-light.e2e.ts')).toBe(false)
    expect(isStandardTest('e2e/theme-fixture-dark.e2e.ts')).toBe(false)
  })

  test('filters test files by matching filters', () => {
    expect(filterTestFiles(sampleFiles, [])).toEqual(sampleFiles)
    expect(filterTestFiles(sampleFiles, ['pie-chart'])).toEqual(['e2e/pie-chart-rendering.e2e.ts'])
    expect(filterTestFiles(sampleFiles, ['theme-fixture'])).toEqual([
      'e2e/theme-fixture-light.e2e.ts',
      'e2e/theme-fixture-dark.e2e.ts',
    ])
    expect(filterTestFiles(sampleFiles, ['custom.e2e.ts'])).toEqual(['custom.e2e.ts'])
  })

  test('plans three suites in order when all files are present', () => {
    const suites = planTestSuites(sampleFiles)
    expect(suites).toHaveLength(3)

    expect(suites[0]?.name).toBe('standard')
    expect(suites[0]?.theme).toBeUndefined()
    expect(suites[0]?.files).toEqual([
      'e2e/area-chart-rendering.e2e.ts',
      'e2e/pie-chart-rendering.e2e.ts',
    ])

    expect(suites[1]?.name).toBe('light')
    expect(suites[1]?.theme).toBe('light')
    expect(suites[1]?.files).toEqual(['e2e/theme-fixture-light.e2e.ts'])

    expect(suites[2]?.name).toBe('dark')
    expect(suites[2]?.theme).toBe('dark')
    expect(suites[2]?.files).toEqual(['e2e/theme-fixture-dark.e2e.ts'])
  })

  test('filters suites by suiteChoice', () => {
    const standardOnly = planTestSuites(sampleFiles, 'standard')
    expect(standardOnly).toHaveLength(1)
    expect(standardOnly[0]?.name).toBe('standard')

    const lightOnly = planTestSuites(sampleFiles, 'light')
    expect(lightOnly).toHaveLength(1)
    expect(lightOnly[0]?.name).toBe('light')

    const darkOnly = planTestSuites(sampleFiles, 'dark')
    expect(darkOnly).toHaveLength(1)
    expect(darkOnly[0]?.name).toBe('dark')
  })

  test('omits suites with no test files', () => {
    const onlyLight = planTestSuites(['e2e/theme-fixture-light.e2e.ts'])
    expect(onlyLight).toHaveLength(1)
    expect(onlyLight[0]?.name).toBe('light')

    const onlyStandard = planTestSuites(['e2e/pie-chart-rendering.e2e.ts'])
    expect(onlyStandard).toHaveLength(1)
    expect(onlyStandard[0]?.name).toBe('standard')
  })
})

describe('Ephemeral port finding', () => {
  test('resolves to a valid port number', async () => {
    const port = await findFreePort()
    expect(typeof port).toBe('number')
    expect(port).toBeGreaterThan(1_024)
    expect(port).toBeLessThan(65_536)
  })
})

describe('Chrome DevTools Protocol readiness wait', () => {
  test('rejects immediately when process exited early with code', async () => {
    const proc = childProcess.spawn('true')
    await new Promise<void>((resolve) => {
      proc.once('exit', () => resolve())
    })

    const attempt = waitForCdpReady(9_999, proc, { timeoutMs: 1_000, pollIntervalMs: 20 })
    expect(attempt).rejects.toThrow('Obsidian process exited early with code 0')
  })

  test('rejects with timeout error when CDP endpoint does not respond', async () => {
    const proc = childProcess.spawn('bun', ['-e', 'await new Promise(() => {})'], { detached: true })
    try {
      const attempt = waitForCdpReady(9_999, proc, { timeoutMs: 50, pollIntervalMs: 10 })
      expect(attempt).rejects.toThrow('Timed out waiting for Obsidian CDP endpoint on port 9999')
    }
    finally {
      if (proc.pid !== undefined) {
        try {
          process.kill(-proc.pid, 'SIGKILL')
        }
        catch (err: unknown) {
          // Process may have exited
          void err
        }
      }
    }
  })

  test('resolves when CDP target and window.app are ready', async () => {
    const server = Bun.serve({
      port: 0,
      websocket: {
        message(ws, raw) {
          const parsed: unknown = JSON.parse(String(raw))
          if (
            typeof parsed === 'object'
            && parsed !== null
            && 'method' in parsed
            && parsed.method === 'Runtime.evaluate'
            && 'id' in parsed
            && typeof parsed.id === 'number'
          ) {
            ws.send(JSON.stringify({
              id: parsed.id,
              result: { result: { type: 'boolean', value: true } },
            }))
          }
        },
      },
      fetch(req, srv) {
        const url = new URL(req.url)
        if (url.pathname === '/json/list') {
          return Response.json([
            {
              id: 'target-1',
              type: 'page',
              webSocketDebuggerUrl: `ws://127.0.0.1:${srv.port}/devtools/page/1`,
            },
          ])
        }
        if (srv.upgrade(req)) {
          return undefined
        }
        return new Response('Not found', { status: 404 })
      },
    })

    const proc = childProcess.spawn('bun', ['-e', 'await new Promise(() => {})'], { detached: true })
    const port = server.port ?? 0

    try {
      await waitForCdpReady(port, proc, { timeoutMs: 2_000, pollIntervalMs: 50 })
    }
    finally {
      if (proc.pid !== undefined) {
        try {
          process.kill(-proc.pid, 'SIGKILL')
        }
        catch (err: unknown) {
          // Process may have exited
          void err
        }
      }
      await server.stop(true)
    }
  })
})

describe('Obsidian process termination and cleanup', () => {
  test('terminates child process and cleans up temporary directory', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bck-e2e-stop-test-'))
    const proc = childProcess.spawn('sleep', ['10'], { detached: true })

    await stopObsidian(proc, tempDir, undefined, 500)

    expect(proc.exitCode !== null || proc.signalCode !== null).toBe(true)
    const exists = await fs.access(tempDir).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })

  test('handles already stopped process cleanly', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bck-e2e-dead-test-'))
    const proc = childProcess.spawn('true')
    await new Promise<void>((resolve) => {
      proc.once('exit', () => resolve())
    })

    await stopObsidian(proc, tempDir, undefined, 500)

    const exists = await fs.access(tempDir).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })

  test('registers and removes termination signal handlers', () => {
    const proc = childProcess.spawn('sleep', ['5'])
    const removeHandlers = terminateOnSignal(proc, '/tmp/nonexistent-config', undefined)

    expect(typeof removeHandlers).toBe('function')
    removeHandlers()
    proc.kill()
  })
})

describe('Bun test runner spawn helper', () => {
  test('executes command and sets environment variable', async () => {
    const exitCode = await runBunTest({
      cdpPort: 12_345,
      testFiles: [],
      passthroughArgs: ['--help'],
      stdio: ['ignore', 'ignore', 'ignore'],
    })
    expect(exitCode).toBe(0)
  })
})

class SuiteRecorder {
  public executedSuites: string[] = []

  public record(suiteName: string): void {
    this.executedSuites.push(suiteName)
  }
}

describe('High-level orchestrator execution', () => {
  const mockFiles = [
    'e2e/area-chart-rendering.e2e.ts',
    'e2e/theme-fixture-light.e2e.ts',
    'e2e/theme-fixture-dark.e2e.ts',
  ]

  test('returns 0 when help flag is passed', async () => {
    const exitCode = await runOrchestrator(['--help'])
    expect(exitCode).toBe(0)
  })

  test('returns 0 when no test files match', async () => {
    const exitCode = await runOrchestrator(['--suite', 'light'], {
      allFiles: ['e2e/area-chart-rendering.e2e.ts'],
    })
    expect(exitCode).toBe(0)
  })

  test('executes planned suites in order and returns 0 on success', async () => {
    const recorder = new SuiteRecorder()
    const exitCode = await runOrchestrator([], {
      allFiles: mockFiles,
      suiteRunner: (suite: TestSuite): Promise<number> => {
        recorder.record(suite.name)
        return Promise.resolve(0)
      },
    })

    expect(exitCode).toBe(0)
    expect(recorder.executedSuites).toEqual(['standard', 'light', 'dark'])
  })

  test('returns 1 when any suite fails', async () => {
    const exitCode = await runOrchestrator([], {
      allFiles: mockFiles,
      suiteRunner: (suite: TestSuite): Promise<number> => {
        if (suite.name === 'light') {
          return Promise.resolve(1)
        }
        return Promise.resolve(0)
      },
    })

    expect(exitCode).toBe(1)
  })

  test('bails immediately after suite failure when --bail flag is set', async () => {
    const recorder = new SuiteRecorder()
    const exitCode = await runOrchestrator(['--bail'], {
      allFiles: mockFiles,
      suiteRunner: (suite: TestSuite): Promise<number> => {
        recorder.record(suite.name)
        return Promise.resolve(1)
      },
    })

    expect(exitCode).toBe(1)
    expect(recorder.executedSuites).toEqual(['standard'])
  })
})
