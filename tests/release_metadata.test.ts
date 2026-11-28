import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const REPO_ROOT = resolve(import.meta.dir, '..')
const VALIDATE_METADATA_SCRIPT = resolve(REPO_ROOT, 'scripts/release/validate-metadata.sh')
const VALIDATE_CALVER_SCRIPT = resolve(REPO_ROOT, 'scripts/release/validate-calver.sh')

type MetadataFiles = Readonly<Record<string, string>>

function runScript(
  scriptPath: string,
  args: readonly string[],
): {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
} {
  const result = Bun.spawnSync({
    cmd: ['bash', scriptPath, ...args],
    cwd: REPO_ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  }
}

function withTempMetadataDir<T>(files: MetadataFiles, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'release-metadata-test-'))
  try {
    Object.entries(files).forEach(([filename, content]) => {
      writeFileSync(join(dir, filename), content, 'utf8')
    })
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

type MetadataCase = {
  readonly name: string
  readonly tag: string
  readonly files: MetadataFiles
  readonly expectedExitCode: number
  readonly expectedStderrSubstring?: string
}

const VALID_METADATA_CASES: readonly MetadataCase[] = [
  {
    name: 'accepts exact SemVer match',
    tag: '0.2.0',
    files: {
      'manifest.json': JSON.stringify({ version: '0.2.0', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '0.2.0' }),
      'versions.json': JSON.stringify({ '0.0.1': '1.11.4', '0.2.0': '1.13.4' }),
    },
    expectedExitCode: 0,
  },
  {
    name: 'accepts exact CalVer match',
    tag: '2026.11.27',
    files: {
      'manifest.json': JSON.stringify({ version: '2026.11.27', minAppVersion: '1.14.0' }),
      'package.json': JSON.stringify({ version: '2026.11.27' }),
      'versions.json': JSON.stringify({ '0.2.0': '1.13.4', '2026.11.27': '1.14.0' }),
    },
    expectedExitCode: 0,
  },
  {
    name: 'resolves sparse versions.json for CalVer tag above SemVer entries',
    tag: '2026.11.27',
    files: {
      'manifest.json': JSON.stringify({ version: '2026.11.27', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '2026.11.27' }),
      'versions.json': JSON.stringify({ '0.0.1': '1.11.4', '0.2.0': '1.13.4' }),
    },
    expectedExitCode: 0,
  },
  {
    name: 'resolves sparse versions.json for patch release above latest key',
    tag: '0.2.5',
    files: {
      'manifest.json': JSON.stringify({ version: '0.2.5', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '0.2.5' }),
      'versions.json': JSON.stringify({ '0.0.1': '1.11.4', '0.2.0': '1.13.4' }),
    },
    expectedExitCode: 0,
  },
  {
    name: 'orders CalVer version tuples numerically rather than lexicographically',
    tag: '2026.10.5',
    files: {
      'manifest.json': JSON.stringify({ version: '2026.10.5', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '2026.10.5' }),
      'versions.json': JSON.stringify({ '2026.2.1': '1.12.0', '2026.10.1': '1.13.4' }),
    },
    expectedExitCode: 0,
  },
  {
    name: 'orders SemVer version tuples numerically rather than lexicographically',
    tag: '0.10.1',
    files: {
      'manifest.json': JSON.stringify({ version: '0.10.1', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '0.10.1' }),
      'versions.json': JSON.stringify({ '0.2.0': '1.12.0', '0.10.0': '1.13.4' }),
    },
    expectedExitCode: 0,
  },
  {
    name: 'ignores versions.json keys newer than the release tag',
    tag: '2026.11.27',
    files: {
      'manifest.json': JSON.stringify({ version: '2026.11.27', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '2026.11.27' }),
      'versions.json': JSON.stringify({
        '0.0.1': '1.11.4',
        '0.2.0': '1.13.4',
        '2026.12.1': '1.15.0',
      }),
    },
    expectedExitCode: 0,
  },
]

const INVALID_METADATA_CASES: readonly MetadataCase[] = [
  {
    name: 'rejects v-prefixed tag even when metadata matches',
    tag: 'v2026.11.27',
    files: {
      'manifest.json': JSON.stringify({ version: 'v2026.11.27', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: 'v2026.11.27' }),
      'versions.json': JSON.stringify({ '0.2.0': '1.13.4' }),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'Invalid release tag',
  },
  {
    name: 'rejects tag with leading zeros',
    tag: '2026.02.01',
    files: {
      'manifest.json': JSON.stringify({ version: '2026.02.01', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '2026.02.01' }),
      'versions.json': JSON.stringify({ '0.2.0': '1.13.4' }),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'Invalid release tag',
  },
  {
    name: 'rejects manifest.json version mismatch',
    tag: '2026.11.27',
    files: {
      'manifest.json': JSON.stringify({ version: '0.2.0', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '2026.11.27' }),
      'versions.json': JSON.stringify({ '0.2.0': '1.13.4' }),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'manifest.json',
  },
  {
    name: 'rejects package.json version mismatch',
    tag: '2026.11.27',
    files: {
      'manifest.json': JSON.stringify({ version: '2026.11.27', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '0.2.0' }),
      'versions.json': JSON.stringify({ '0.2.0': '1.13.4' }),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'package.json',
  },
  {
    name: 'rejects minAppVersion mismatch against applicable versions.json entry',
    tag: '2026.11.27',
    files: {
      'manifest.json': JSON.stringify({ version: '2026.11.27', minAppVersion: '1.11.4' }),
      'package.json': JSON.stringify({ version: '2026.11.27' }),
      'versions.json': JSON.stringify({
        '0.0.1': '1.11.4',
        '0.2.0': '1.13.4',
        '2026.12.1': '1.15.0',
      }),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'minAppVersion mismatch',
  },
  {
    name: 'rejects empty versions.json',
    tag: '2026.11.27',
    files: {
      'manifest.json': JSON.stringify({ version: '2026.11.27', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '2026.11.27' }),
      'versions.json': JSON.stringify({}),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'No applicable entry',
  },
  {
    name: 'rejects versions.json when all keys exceed the release tag',
    tag: '0.1.0',
    files: {
      'manifest.json': JSON.stringify({ version: '0.1.0', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '0.1.0' }),
      'versions.json': JSON.stringify({ '0.2.0': '1.13.4' }),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'No applicable entry',
  },
  {
    name: 'rejects missing manifest.json',
    tag: '0.2.0',
    files: {
      'package.json': JSON.stringify({ version: '0.2.0' }),
      'versions.json': JSON.stringify({ '0.2.0': '1.13.4' }),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'Missing required metadata file',
  },
  {
    name: 'rejects missing package.json',
    tag: '0.2.0',
    files: {
      'manifest.json': JSON.stringify({ version: '0.2.0', minAppVersion: '1.13.4' }),
      'versions.json': JSON.stringify({ '0.2.0': '1.13.4' }),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'Missing required metadata file',
  },
  {
    name: 'rejects missing versions.json',
    tag: '0.2.0',
    files: {
      'manifest.json': JSON.stringify({ version: '0.2.0', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '0.2.0' }),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'Missing required metadata file',
  },
  {
    name: 'rejects non-object JSON in versions.json',
    tag: '0.2.0',
    files: {
      'manifest.json': JSON.stringify({ version: '0.2.0', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '0.2.0' }),
      'versions.json': JSON.stringify(['0.2.0']),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'Invalid JSON object',
  },
  {
    name: 'rejects empty minAppVersion in manifest.json',
    tag: '0.2.0',
    files: {
      'manifest.json': JSON.stringify({ version: '0.2.0', minAppVersion: '' }),
      'package.json': JSON.stringify({ version: '0.2.0' }),
      'versions.json': JSON.stringify({ '0.2.0': '1.13.4' }),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'minAppVersion',
  },
  {
    name: 'rejects malformed version key in versions.json',
    tag: '0.2.0',
    files: {
      'manifest.json': JSON.stringify({ version: '0.2.0', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '0.2.0' }),
      'versions.json': JSON.stringify({ 'v0.2.0': '1.13.4' }),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'invalid version key',
  },
  {
    name: 'rejects empty minAppVersion value in versions.json',
    tag: '0.2.0',
    files: {
      'manifest.json': JSON.stringify({ version: '0.2.0', minAppVersion: '1.13.4' }),
      'package.json': JSON.stringify({ version: '0.2.0' }),
      'versions.json': JSON.stringify({ '0.2.0': '' }),
    },
    expectedExitCode: 1,
    expectedStderrSubstring: 'invalid minAppVersion value',
  },
]

type CalverCase = {
  readonly name: string
  readonly tag: string
  readonly expectedExitCode: number
}

const CALVER_CASES: readonly CalverCase[] = [
  { name: 'accepts valid CalVer date 2026.11.27', tag: '2026.11.27', expectedExitCode: 0 },
  {
    name: 'accepts valid single-digit month and day 2026.1.1',
    tag: '2026.1.1',
    expectedExitCode: 0,
  },
  { name: 'rejects impossible calendar date 2026.2.30', tag: '2026.2.30', expectedExitCode: 1 },
  { name: 'rejects leading zeros 2026.02.01', tag: '2026.02.01', expectedExitCode: 1 },
  { name: 'rejects v-prefixed tag v2026.11.27', tag: 'v2026.11.27', expectedExitCode: 1 },
  { name: 'rejects SemVer tag 0.2.0', tag: '0.2.0', expectedExitCode: 1 },
]

describe('validate-metadata.sh', () => {
  it.each([...VALID_METADATA_CASES])('$name', ({ tag, files, expectedExitCode }) => {
    withTempMetadataDir(files, dir => {
      const result = runScript(VALIDATE_METADATA_SCRIPT, [tag, dir])
      expect(result.exitCode).toBe(expectedExitCode)
      expect(result.stderr).toBe('')
    })
  })

  it.each([...INVALID_METADATA_CASES])(
    '$name',
    ({ tag, files, expectedExitCode, expectedStderrSubstring }) => {
      withTempMetadataDir(files, dir => {
        const result = runScript(VALIDATE_METADATA_SCRIPT, [tag, dir])
        expect(result.exitCode).toBe(expectedExitCode)
        if (expectedStderrSubstring !== undefined) {
          expect(result.stderr).toContain(expectedStderrSubstring)
        }
      })
    },
  )
})

describe('validate-calver.sh', () => {
  it.each([...CALVER_CASES])('$name', ({ tag, expectedExitCode }) => {
    const result = runScript(VALIDATE_CALVER_SCRIPT, [tag])
    expect(result.exitCode).toBe(expectedExitCode)
  })
})
