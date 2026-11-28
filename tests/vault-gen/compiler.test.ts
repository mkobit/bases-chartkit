import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  writeAllChartTypeDirectories,
  writeChartTypeDirectory,
} from '../../scripts/vault-gen/compiler'
import type { ChartExampleSpec, FrontmatterRow } from '../../scripts/vault-gen/spec'

function makeSpec(overrides: Partial<ChartExampleSpec> = {}): ChartExampleSpec {
  return {
    chartType: 'bar',
    description: 'Bar chart example',
    notePrefix: 'bar-item',
    variants: [
      {
        fileName: 'Basic.base',
        viewName: 'Basic bar',
        viewType: 'bar',
        propBindings: {
          x: 'note.category',
          y: 'note.value',
        },
      },
    ],
    sampleRows: () => [
      { category: 'Alpha', value: 10 },
      { category: 'Beta', value: 20 },
    ],
    ...overrides,
  }
}

async function withTempVault(fn: (vaultRoot: string) => Promise<void>): Promise<void> {
  const vaultRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bck-compiler-test-'))
  try {
    await fn(vaultRoot)
  } finally {
    await fs.rm(vaultRoot, { recursive: true, force: true })
  }
}

async function expectRejection(
  promise: Promise<unknown>,
  messageSubstring?: string,
): Promise<void> {
  const outcome = await promise.then(
    () => ({ rejected: false as const }),
    (error: unknown) => ({ rejected: true as const, error }),
  )
  expect(outcome.rejected).toBe(true)
  if (outcome.rejected && messageSubstring !== undefined) {
    const message = outcome.error instanceof Error ? outcome.error.message : String(outcome.error)
    expect(message).toContain(messageSubstring)
  }
}

async function seedExistingChartDirectory(vaultRoot: string, chartType: string): Promise<void> {
  const chartDir = path.join(vaultRoot, chartType)
  await fs.mkdir(path.join(chartDir, 'notes'), { recursive: true })
  await fs.mkdir(path.join(chartDir, 'assets'), { recursive: true })
  await fs.mkdir(path.join(chartDir, 'stale-variant'), { recursive: true })

  await fs.writeFile(path.join(chartDir, 'notes', 'old-0.md'), '---\nold: true\n---\n', 'utf-8')
  await fs.writeFile(path.join(chartDir, 'Basic.base'), 'old-base-content', 'utf-8')
  await fs.writeFile(path.join(chartDir, 'OldOnly.base'), 'stale-base-content', 'utf-8')
  await fs.writeFile(path.join(chartDir, 'stale-variant', 'Variant.base'), 'stale-variant', 'utf-8')
  await fs.writeFile(
    path.join(chartDir, 'assets', 'geo.json'),
    '{"type":"FeatureCollection"}',
    'utf-8',
  )
}

async function assertExistingFilesPreserved(vaultRoot: string, chartType: string): Promise<void> {
  const chartDir = path.join(vaultRoot, chartType)
  expect(await fs.readFile(path.join(chartDir, 'notes', 'old-0.md'), 'utf-8')).toBe(
    '---\nold: true\n---\n',
  )
  expect(await fs.readFile(path.join(chartDir, 'Basic.base'), 'utf-8')).toBe('old-base-content')
  expect(await fs.readFile(path.join(chartDir, 'OldOnly.base'), 'utf-8')).toBe('stale-base-content')
  expect(await fs.readFile(path.join(chartDir, 'assets', 'geo.json'), 'utf-8')).toBe(
    '{"type":"FeatureCollection"}',
  )
}

describe('writeChartTypeDirectory', () => {
  test('writes notes and base files into a new chart-type directory without leaving staging dirs', async () => {
    await withTempVault(async vaultRoot => {
      const spec = makeSpec()

      const result = await writeChartTypeDirectory(spec, 42, vaultRoot)

      expect(result).toEqual({
        chartType: 'bar',
        noteCount: 2,
        baseFileCount: 1,
      })

      const vaultEntries = await fs.readdir(vaultRoot)
      expect(vaultEntries).toEqual(['bar'])

      const noteFiles = (await fs.readdir(path.join(vaultRoot, 'bar', 'notes'))).toSorted()
      expect(noteFiles).toEqual(['bar-item-0.md', 'bar-item-1.md'])

      const baseContent = await fs.readFile(path.join(vaultRoot, 'bar', 'Basic.base'), 'utf-8')
      expect(baseContent).toContain('type: bar')
    })
  })

  test('removes stale files and variant subdirectories on regeneration while preserving assets', async () => {
    await withTempVault(async vaultRoot => {
      await seedExistingChartDirectory(vaultRoot, 'bar')

      const spec = makeSpec()
      const result = await writeChartTypeDirectory(spec, 42, vaultRoot)

      expect(result).toEqual({
        chartType: 'bar',
        noteCount: 2,
        baseFileCount: 1,
      })

      const chartEntries = (await fs.readdir(path.join(vaultRoot, 'bar'))).toSorted()
      expect(chartEntries).toEqual(['Basic.base', 'assets', 'notes'])

      const noteFiles = (await fs.readdir(path.join(vaultRoot, 'bar', 'notes'))).toSorted()
      expect(noteFiles).toEqual(['bar-item-0.md', 'bar-item-1.md'])

      expect(await fs.readFile(path.join(vaultRoot, 'bar', 'assets', 'geo.json'), 'utf-8')).toBe(
        '{"type":"FeatureCollection"}',
      )
      expect(await fs.readdir(vaultRoot)).toEqual(['bar'])
    })
  })

  test('preserves previous chart files and assets when sampleRows throws', async () => {
    await withTempVault(async vaultRoot => {
      await seedExistingChartDirectory(vaultRoot, 'bar')

      const spec = makeSpec({
        sampleRows: (): readonly FrontmatterRow[] => (JSON.parse('{invalid') ? [] : []),
      })

      await expectRejection(writeChartTypeDirectory(spec, 42, vaultRoot))
      await assertExistingFilesPreserved(vaultRoot, 'bar')
      expect(await fs.readdir(vaultRoot)).toEqual(['bar'])
    })
  })

  test('preserves previous chart files and assets when note writing fails', async () => {
    await withTempVault(async vaultRoot => {
      await seedExistingChartDirectory(vaultRoot, 'bar')

      const spec = makeSpec({
        notePrefix: 'invalid\0prefix',
      })

      await expectRejection(
        writeChartTypeDirectory(spec, 42, vaultRoot),
        'Failed to write 2 note(s) for bar',
      )
      await assertExistingFilesPreserved(vaultRoot, 'bar')
      expect(await fs.readdir(vaultRoot)).toEqual(['bar'])
    })
  })

  test('preserves previous chart files and assets when base file writing fails', async () => {
    await withTempVault(async vaultRoot => {
      await seedExistingChartDirectory(vaultRoot, 'bar')

      // Variant fileName collides with the generated `notes/` directory, causing EISDIR on writeFile.
      const spec = makeSpec({
        variants: [
          {
            fileName: 'notes',
            viewName: 'Colliding view',
            viewType: 'bar',
            propBindings: { x: 'note.category', y: 'note.value' },
          },
        ],
      })

      await expectRejection(writeChartTypeDirectory(spec, 42, vaultRoot))
      await assertExistingFilesPreserved(vaultRoot, 'bar')
      expect(await fs.readdir(vaultRoot)).toEqual(['bar'])
    })
  })

  test('propagates unexpected scan errors when target path is not a directory', async () => {
    await withTempVault(async vaultRoot => {
      const targetFile = path.join(vaultRoot, 'bar')
      await fs.writeFile(targetFile, 'not-a-directory', 'utf-8')

      const spec = makeSpec()

      await expectRejection(writeChartTypeDirectory(spec, 42, vaultRoot))
      expect(await fs.readFile(targetFile, 'utf-8')).toBe('not-a-directory')
      expect(await fs.readdir(vaultRoot)).toEqual(['bar'])
    })
  })

  test('writes notes and base files for a nested chartType into a fresh vaultRoot', async () => {
    await withTempVault(async vaultRoot => {
      const spec = makeSpec({ chartType: 'category/bar' })

      const result = await writeChartTypeDirectory(spec, 42, vaultRoot)

      expect(result).toEqual({
        chartType: 'category/bar',
        noteCount: 2,
        baseFileCount: 1,
      })

      expect(await fs.readdir(vaultRoot)).toEqual(['category'])
      const noteFiles = (
        await fs.readdir(path.join(vaultRoot, 'category', 'bar', 'notes'))
      ).toSorted()
      expect(noteFiles).toEqual(['bar-item-0.md', 'bar-item-1.md'])

      const baseContent = await fs.readFile(
        path.join(vaultRoot, 'category', 'bar', 'Basic.base'),
        'utf-8',
      )
      expect(baseContent).toContain('type: bar')
    })
  })

  test('writeAllChartTypeDirectories writes all specs without leaving staging dirs', async () => {
    await withTempVault(async vaultRoot => {
      const specs = [
        makeSpec({ chartType: 'bar', notePrefix: 'bar-item' }),
        makeSpec({ chartType: 'line', notePrefix: 'line-item' }),
      ]

      const results = await writeAllChartTypeDirectories(specs, 7, vaultRoot)

      expect(results).toEqual([
        { chartType: 'bar', noteCount: 2, baseFileCount: 1 },
        { chartType: 'line', noteCount: 2, baseFileCount: 1 },
      ])
      expect((await fs.readdir(vaultRoot)).toSorted()).toEqual(['bar', 'line'])
    })
  })
})
