import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { connectCdp } from '../e2e/cdp/client'
import { createObsidianPage } from '../e2e/fixtures/obsidian'
import {
  baseFileSlug,
  captureCanvasScreenshot,
  captureView,
  collectChartViews,
  kebabSlug,
  prepareOutputDir,
  resolveSurveyTheme,
  runSurvey,
  screenshotFileName,
} from '../scripts/survey-chart-types'
import type { ChartViewEntry } from '../scripts/survey-chart-types'

describe('kebabSlug and screenshotFileName', () => {
  test('converts strings to lowercase kebab-case and trims leading/trailing hyphens', () => {
    expect(kebabSlug('Sales Area Chart')).toBe('sales-area-chart')
    expect(kebabSlug('---Weighted Point Cloud (Bubble)---')).toBe('weighted-point-cloud-bubble')
  })

  test('drops middle path segments in baseFileSlug to avoid duplicating variant directory names', () => {
    expect(baseFileSlug('bar/Basic.base')).toBe('bar-basic')
    expect(baseFileSlug('effect-scatter/sized-by-population/Sized-By-Population.base')).toBe(
      'effect-scatter-sized-by-population',
    )
    expect(baseFileSlug('pie.base')).toBe('pie')
  })

  test('formats screenshotFileName as <baseSlug>--<viewSlug>.png', () => {
    expect(
      screenshotFileName({
        baseFile: 'bar/Basic.base',
        viewName: 'Department Spend',
        chartType: 'echarts-bar',
      }),
    ).toBe('bar-basic--department-spend.png')
  })
})

describe('resolveSurveyTheme', () => {
  test('defaults to undefined theme and docs/images/chart-types output directory when SURVEY_THEME is unset', () => {
    const resolved = resolveSurveyTheme(undefined, '/repo')
    expect(resolved.theme).toBeUndefined()
    expect(resolved.outputDir).toBe('/repo/docs/images/chart-types')
    expect(resolved.warning).toBeUndefined()
  })

  test('resolves dark theme and .test-output/chart-types-dark when SURVEY_THEME is dark', () => {
    const resolved = resolveSurveyTheme('dark', '/repo')
    expect(resolved.theme).toBe('dark')
    expect(resolved.outputDir).toBe('/repo/.test-output/chart-types-dark')
    expect(resolved.warning).toBeUndefined()
  })

  test('warns and falls back to light mode when SURVEY_THEME has an unrecognized value', () => {
    const resolved = resolveSurveyTheme('sepia', '/repo')
    expect(resolved.theme).toBeUndefined()
    expect(resolved.outputDir).toBe('/repo/docs/images/chart-types')
    expect(resolved.warning).toContain(
      'SURVEY_THEME=sepia is not "dark"; falling back to light mode',
    )
  })
})

describe('collectChartViews', () => {
  test('collects and sorts chart view entries from .base YAML files using Bun.YAML', async () => {
    const tempVault = await fs.mkdtemp(path.join(os.tmpdir(), 'bck-survey-vault-'))
    try {
      await fs.mkdir(path.join(tempVault, 'pie'), { recursive: true })
      await fs.mkdir(path.join(tempVault, 'bar'), { recursive: true })

      await fs.writeFile(
        path.join(tempVault, 'pie', 'Basic.base'),
        'views:\n  - type: echarts-pie\n    name: Revenue Share\n',
      )
      await fs.writeFile(
        path.join(tempVault, 'bar', 'Basic.base'),
        'views:\n  - type: echarts-bar\n    name: Department Spend\n  - type: echarts-bar\n    name: Quarterly Growth\n',
      )
      await fs.writeFile(path.join(tempVault, 'bar', 'Note.md'), '# Ignored markdown note\n')

      const entries = collectChartViews(tempVault)
      expect(entries).toEqual([
        {
          baseFile: 'bar/Basic.base',
          viewName: 'Department Spend',
          chartType: 'echarts-bar',
        },
        {
          baseFile: 'bar/Basic.base',
          viewName: 'Quarterly Growth',
          chartType: 'echarts-bar',
        },
        {
          baseFile: 'pie/Basic.base',
          viewName: 'Revenue Share',
          chartType: 'echarts-pie',
        },
      ])
    } finally {
      await fs.rm(tempVault, { recursive: true, force: true })
    }
  })
})

describe('captureCanvasScreenshot and captureView', () => {
  test('captures canvas bounding rect clip via CDP and writes PNG file', async () => {
    let capturedParams: readonly unknown[] = []
    const server = Bun.serve({
      port: 0,
      fetch(req, srv) {
        if (srv.upgrade(req)) {
          return undefined
        }
        return new Response('Upgrade required', { status: 400 })
      },
      websocket: {
        message(ws, raw) {
          const parsed: {
            readonly id?: number
            readonly method?: string
            readonly params?: { readonly expression?: string }
          } = JSON.parse(String(raw))

          if (parsed.method === 'Runtime.evaluate') {
            const expr = parsed.params?.expression ?? ''
            if (expr.includes('getBoundingClientRect')) {
              ws.send(
                JSON.stringify({
                  id: parsed.id,
                  result: {
                    result: {
                      value: { x: 12, y: 34, width: 668, height: 501 },
                    },
                  },
                }),
              )
              return
            }
            ws.send(
              JSON.stringify({
                id: parsed.id,
                result: {
                  result: {
                    value: 1,
                  },
                },
              }),
            )
            return
          }

          if (parsed.method === 'Page.captureScreenshot') {
            capturedParams = [...capturedParams, parsed.params]
            ws.send(
              JSON.stringify({
                id: parsed.id,
                result: {
                  data: Buffer.from('png-canvas-bytes').toString('base64'),
                },
              }),
            )
            return
          }

          ws.send(JSON.stringify({ id: parsed.id, result: {} }))
        },
      },
    })

    const tempOut = await fs.mkdtemp(path.join(os.tmpdir(), 'bck-survey-out-'))
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const outPath = path.join(tempOut, 'canvas.png')
      await captureCanvasScreenshot(page, outPath)

      const content = await fs.readFile(outPath, 'utf8')
      expect(content).toBe('png-canvas-bytes')
      expect(capturedParams).toEqual([
        {
          format: 'png',
          clip: { x: 12, y: 34, width: 668, height: 501, scale: 1 },
        },
      ])

      const result = await captureView(
        page,
        {
          baseFile: 'bar/Basic.base',
          viewName: 'Department Spend',
          chartType: 'echarts-bar',
        },
        tempOut,
        5_000,
      )
      expect(result).toEqual({
        entry: {
          baseFile: 'bar/Basic.base',
          viewName: 'Department Spend',
          chartType: 'echarts-bar',
        },
        fileName: 'bar-basic--department-spend.png',
        ok: true,
      })
    } finally {
      await client.close()
      await server.stop(true)
      await fs.rm(tempOut, { recursive: true, force: true })
    }
  })

  test('returns ok: false with error message when view capture fails', async () => {
    const server = Bun.serve({
      port: 0,
      fetch(req, srv) {
        if (srv.upgrade(req)) {
          return undefined
        }
        return new Response('Upgrade required', { status: 400 })
      },
      websocket: {
        message(ws, raw) {
          const parsed: { readonly id?: number; readonly method?: string } = JSON.parse(String(raw))
          if (parsed.method === 'Runtime.evaluate') {
            ws.send(
              JSON.stringify({
                id: parsed.id,
                result: {
                  exceptionDetails: {
                    text: 'Simulated renderer error',
                  },
                },
              }),
            )
            return
          }
          ws.send(JSON.stringify({ id: parsed.id, result: {} }))
        },
      },
    })

    const tempOut = await fs.mkdtemp(path.join(os.tmpdir(), 'bck-survey-err-'))
    const client = await connectCdp(`ws://127.0.0.1:${server.port}`)
    const page = createObsidianPage(client)

    try {
      const result = await captureView(
        page,
        {
          baseFile: 'bar/Basic.base',
          viewName: 'Broken View',
          chartType: 'echarts-bar',
        },
        tempOut,
        5_000,
      )
      expect(result.ok).toBe(false)
      expect(result.fileName).toBe('bar-basic--broken-view.png')
      expect(result.error).toContain('Simulated renderer error')
    } finally {
      await client.close()
      await server.stop(true)
      await fs.rm(tempOut, { recursive: true, force: true })
    }
  })
})

describe('prepareOutputDir and runSurvey completeness', () => {
  const barEntry: ChartViewEntry = {
    baseFile: 'bar/Basic.base',
    viewName: 'Department Spend',
    chartType: 'echarts-bar',
  }
  const pieEntry: ChartViewEntry = {
    baseFile: 'pie/Basic.base',
    viewName: 'Revenue Share',
    chartType: 'echarts-pie',
  }
  const lineEntry: ChartViewEntry = {
    baseFile: 'line/Basic.base',
    viewName: 'Trend Line',
    chartType: 'echarts-line',
  }
  const sampleEntries: ReadonlyArray<ChartViewEntry> = [barEntry, pieEntry, lineEntry]

  test('prepareOutputDir clears stale files from previous runs', async () => {
    const tempOut = await fs.mkdtemp(path.join(os.tmpdir(), 'bck-survey-clean-'))
    try {
      await fs.writeFile(path.join(tempOut, 'stale.png'), 'old-bytes')
      await fs.mkdir(path.join(tempOut, 'nested'), { recursive: true })
      await fs.writeFile(path.join(tempOut, 'nested', 'extra.png'), 'nested-bytes')

      prepareOutputDir(tempOut)

      const remaining = await fs.readdir(tempOut)
      expect(remaining).toEqual([])
    } finally {
      await fs.rm(tempOut, { recursive: true, force: true })
    }
  })

  test('runSurvey fails nonzero on partial capture, removes stale images, and reports all failures', async () => {
    const tempOut = await fs.mkdtemp(path.join(os.tmpdir(), 'bck-survey-partial-'))
    try {
      const failingFile = screenshotFileName(pieEntry)
      const obsoleteFile = 'removed-chart--old-view.png'
      await fs.writeFile(path.join(tempOut, failingFile), 'stale-pie-image')
      await fs.writeFile(path.join(tempOut, obsoleteFile), 'stale-removed-image')

      let stderrOutput = ''
      const exitCode = await runSurvey({
        resolveTheme: () => ({ theme: undefined, outputDir: tempOut }),
        collectViews: () => sampleEntries,
        writeStderr: message => {
          stderrOutput += message
        },
        captureEntry: async (entry, outputDir) => {
          const fileName = screenshotFileName(entry)
          if (entry.chartType === 'echarts-pie' || entry.chartType === 'echarts-line') {
            return { entry, fileName, ok: false, error: `simulated failure for ${entry.chartType}` }
          }
          await fs.writeFile(path.join(outputDir, fileName), 'fresh-bar-image')
          return { entry, fileName, ok: true }
        },
      })

      expect(exitCode).toBe(1)

      const files = await fs.readdir(tempOut)
      expect(files).toEqual([screenshotFileName(barEntry)])

      expect(stderrOutput).toContain('captured 1/3 screenshots')
      expect(stderrOutput).toContain('simulated failure for echarts-pie')
      expect(stderrOutput).toContain('simulated failure for echarts-line')
    } finally {
      await fs.rm(tempOut, { recursive: true, force: true })
    }
  })

  test('runSurvey returns 0 when all expected captures succeed and write output files', async () => {
    const tempOut = await fs.mkdtemp(path.join(os.tmpdir(), 'bck-survey-ok-'))
    try {
      await fs.writeFile(path.join(tempOut, 'obsolete.png'), 'stale-bytes')

      let stderrOutput = ''
      const exitCode = await runSurvey({
        resolveTheme: () => ({ theme: undefined, outputDir: tempOut }),
        collectViews: () => sampleEntries,
        writeStderr: message => {
          stderrOutput += message
        },
        captureEntry: async (entry, outputDir) => {
          const fileName = screenshotFileName(entry)
          await fs.writeFile(path.join(outputDir, fileName), `fresh-${entry.chartType}`)
          return { entry, fileName, ok: true }
        },
      })

      expect(exitCode).toBe(0)
      const files = (await fs.readdir(tempOut)).toSorted()
      const expectedFiles = sampleEntries.map(screenshotFileName).toSorted()
      expect(files).toEqual(expectedFiles)
      expect(stderrOutput).toContain('captured 3/3 screenshots')
    } finally {
      await fs.rm(tempOut, { recursive: true, force: true })
    }
  })

  test('runSurvey returns nonzero when no chart views are found', async () => {
    const tempOut = await fs.mkdtemp(path.join(os.tmpdir(), 'bck-survey-empty-'))
    try {
      await fs.writeFile(path.join(tempOut, 'stale.png'), 'stale-bytes')

      let stderrOutput = ''
      const exitCode = await runSurvey({
        resolveTheme: () => ({ theme: undefined, outputDir: tempOut }),
        collectViews: () => [],
        writeStderr: message => {
          stderrOutput += message
        },
      })

      expect(exitCode).toBe(1)
      expect(await fs.readdir(tempOut)).toEqual([])
      expect(stderrOutput).toContain('no chart views found')
    } finally {
      await fs.rm(tempOut, { recursive: true, force: true })
    }
  })

  test('runSurvey returns nonzero when a capture reports ok without producing an output file', async () => {
    const tempOut = await fs.mkdtemp(path.join(os.tmpdir(), 'bck-survey-missing-'))
    try {
      let stderrOutput = ''
      const exitCode = await runSurvey({
        resolveTheme: () => ({ theme: undefined, outputDir: tempOut }),
        collectViews: () => [barEntry],
        writeStderr: message => {
          stderrOutput += message
        },
        captureEntry: async entry => ({
          entry,
          fileName: screenshotFileName(entry),
          ok: true,
        }),
      })

      expect(exitCode).toBe(1)
      expect(stderrOutput).toContain('missing output file')
    } finally {
      await fs.rm(tempOut, { recursive: true, force: true })
    }
  })
})
