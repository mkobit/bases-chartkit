import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments'
import { ESLint } from 'eslint'
import type { Linter } from 'eslint'
import yml from 'eslint-plugin-yml'
import tseslint from 'typescript-eslint'
import {
  QUALITY_RATCHET_FILENAME,
  createQualityRatchetYamlPlugin,
  createRatchetExemptionConfigs,
  isValidRepoRelativeFilePath,
  loadQualityRatchetForConfig,
  parseQualityRatchetYaml,
  validateQualityRatchetEntries,
} from '../shared/quality-ratchet'
import { findStaleExemptions } from '../scripts/quality-ratchet'

async function withTempDir(run: (tempDir: string) => Promise<void>): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'quality-ratchet-test-'))
  try {
    await run(tempDir)
  }
  finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function writeTempFile(rootDir: string, relPath: string, content: string): Promise<string> {
  const absPath = path.join(rootDir, relPath)
  await fs.mkdir(path.dirname(absPath), { recursive: true })
  await fs.writeFile(absPath, content, 'utf-8')
  return absPath
}

function createYamlValidationEslint(rootDir: string): ESLint {
  return new ESLint({
    cwd: rootDir,
    overrideConfigFile: true,
    overrideConfig: [
      ...yml.configs['flat/recommended'],
      {
        files: [QUALITY_RATCHET_FILENAME],
        plugins: {
          'quality-ratchet': createQualityRatchetYamlPlugin(rootDir),
        },
        rules: {
          'yml/sort-keys': ['error', 'asc', { caseSensitive: true, natural: false }],
          'yml/sort-sequence-values': ['error', {
            pathPattern: '.*',
            order: { type: 'asc', caseSensitive: true, natural: false },
          }],
          'quality-ratchet/valid-exemptions': 'error',
        },
      },
    ],
  })
}

function createTsBaseConfigs(): readonly Linter.Config[] {
  return [
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: tseslint.parser,
      },
      plugins: {
        'eslint-comments': eslintComments,
        '@typescript-eslint': tseslint.plugin,
      },
      rules: {
        '@typescript-eslint/consistent-type-assertions': ['error', {
          assertionStyle: 'never',
        }],
        'eslint-comments/no-use': ['error', {
          allow: ['eslint', 'eslint-enable', 'eslint-env', 'exported', 'global', 'globals'],
        }],
      },
    },
  ]
}

describe('parseQualityRatchetYaml', () => {
  test('parses valid mapping of rule IDs to file paths', () => {
    const yaml = [
      '"@typescript-eslint/consistent-type-assertions":',
      '  - tests/a.test.ts',
      'eslint-comments/no-use:',
      '  - src/b.ts',
      '  - src/c.ts',
    ].join('\n')

    const result = parseQualityRatchetYaml(yaml)
    expect(result).toEqual({
      ok: true,
      exemptions: {
        '@typescript-eslint/consistent-type-assertions': ['tests/a.test.ts'],
        'eslint-comments/no-use': ['src/b.ts', 'src/c.ts'],
      },
    })
  })

  test('treats empty YAML document as empty exemptions map', () => {
    expect(parseQualityRatchetYaml('')).toEqual({ ok: true, exemptions: {} })
    expect(parseQualityRatchetYaml('# comment only\n')).toEqual({ ok: true, exemptions: {} })
  })

  test('rejects malformed YAML syntax', () => {
    const result = parseQualityRatchetYaml('eslint-comments/no-use:\n  - [unclosed\n')
    expect(result.ok).toBe(false)
  })

  test('rejects non-mapping root values', () => {
    expect(parseQualityRatchetYaml('- src/a.ts\n').ok).toBe(false)
    expect(parseQualityRatchetYaml('just-a-string\n').ok).toBe(false)
  })

  test('rejects non-array rule entries', () => {
    const result = parseQualityRatchetYaml('eslint-comments/no-use: src/a.ts\n')
    expect(result.ok).toBe(false)
  })
})

describe('isValidRepoRelativeFilePath and validateQualityRatchetEntries', () => {
  test('accepts normalized repo-relative paths and rejects invalid forms', () => {
    expect(isValidRepoRelativeFilePath('eslint.config.mts')).toBe(true)
    expect(isValidRepoRelativeFilePath('src/charts/pie.ts')).toBe(true)

    expect(isValidRepoRelativeFilePath('')).toBe(false)
    expect(isValidRepoRelativeFilePath(' src/a.ts')).toBe(false)
    expect(isValidRepoRelativeFilePath('/abs/path.ts')).toBe(false)
    expect(isValidRepoRelativeFilePath('./src/a.ts')).toBe(false)
    expect(isValidRepoRelativeFilePath('src/../a.ts')).toBe(false)
    expect(isValidRepoRelativeFilePath('src\\a.ts')).toBe(false)
    expect(isValidRepoRelativeFilePath('src/a.ts/')).toBe(false)
  })

  test('reports duplicate files and missing or directory targets on disk', async () => {
    await withTempDir(async (tempDir) => {
      await writeTempFile(tempDir, 'src/exists.ts', 'export const x = 1\n')
      await fs.mkdir(path.join(tempDir, 'src/dir-only'), { recursive: true })

      const errors = validateQualityRatchetEntries({
        'eslint-comments/no-use': [
          'src/exists.ts',
          'src/exists.ts',
          'src/missing.ts',
          'src/dir-only',
          '../escape.ts',
        ],
      }, tempDir)

      expect(errors).toHaveLength(4)
      expect(errors[0]).toContain('Duplicate exempted file "src/exists.ts"')
      expect(errors[1]).toContain('does not exist on disk')
      expect(errors[2]).toContain('does not exist on disk')
      expect(errors[3]).toContain('Invalid file path "../escape.ts"')
    })
  })
})

describe('quality-ratchet YAML ESLint linting', () => {
  test('passes on sorted, unique, existing file exemptions', async () => {
    await withTempDir(async (tempDir) => {
      await writeTempFile(tempDir, 'src/a.ts', 'export const a = 1\n')
      await writeTempFile(tempDir, 'src/b.ts', 'export const b = 2\n')
      await writeTempFile(tempDir, QUALITY_RATCHET_FILENAME, [
        '"@typescript-eslint/consistent-type-assertions":',
        '  - src/a.ts',
        'eslint-comments/no-use:',
        '  - src/a.ts',
        '  - src/b.ts',
        '',
      ].join('\n'))

      const eslint = createYamlValidationEslint(tempDir)
      const [result] = await eslint.lintFiles([QUALITY_RATCHET_FILENAME])
      expect(result?.messages).toEqual([])
    })
  })

  test('fails on duplicate file path under same rule', async () => {
    await withTempDir(async (tempDir) => {
      await writeTempFile(tempDir, 'src/a.ts', 'export const a = 1\n')
      await writeTempFile(tempDir, QUALITY_RATCHET_FILENAME, [
        'eslint-comments/no-use:',
        '  - src/a.ts',
        '  - src/a.ts',
        '',
      ].join('\n'))

      const eslint = createYamlValidationEslint(tempDir)
      const [result] = await eslint.lintFiles([QUALITY_RATCHET_FILENAME])
      const messages = result?.messages.filter(m => m.ruleId === 'quality-ratchet/valid-exemptions') ?? []
      expect(messages).toHaveLength(1)
      expect(messages[0]?.message).toContain('Duplicate exempted file "src/a.ts"')
    })
  })

  test('fails when exempted file does not exist on disk', async () => {
    await withTempDir(async (tempDir) => {
      await writeTempFile(tempDir, QUALITY_RATCHET_FILENAME, [
        'eslint-comments/no-use:',
        '  - src/does-not-exist.ts',
        '',
      ].join('\n'))

      const eslint = createYamlValidationEslint(tempDir)
      const [result] = await eslint.lintFiles([QUALITY_RATCHET_FILENAME])
      const messages = result?.messages.filter(m => m.ruleId === 'quality-ratchet/valid-exemptions') ?? []
      expect(messages).toHaveLength(1)
      expect(messages[0]?.message).toContain('does not exist on disk')
    })
  })

  test('fails when keys or file lists are unsorted', async () => {
    await withTempDir(async (tempDir) => {
      await writeTempFile(tempDir, 'src/a.ts', 'export const a = 1\n')
      await writeTempFile(tempDir, 'src/b.ts', 'export const b = 2\n')
      await writeTempFile(tempDir, QUALITY_RATCHET_FILENAME, [
        'eslint-comments/no-use:',
        '  - src/b.ts',
        '  - src/a.ts',
        '"@typescript-eslint/consistent-type-assertions":',
        '  - src/a.ts',
        '',
      ].join('\n'))

      const eslint = createYamlValidationEslint(tempDir)
      const [result] = await eslint.lintFiles([QUALITY_RATCHET_FILENAME])
      const ruleIds = new Set((result?.messages ?? []).map(m => m.ruleId))
      expect(ruleIds.has('yml/sort-keys')).toBe(true)
      expect(ruleIds.has('yml/sort-sequence-values')).toBe(true)
    })
  })

  test('fails on invalid root, non-sequence rule value, and invalid path syntax', async () => {
    await withTempDir(async (tempDir) => {
      await writeTempFile(tempDir, QUALITY_RATCHET_FILENAME, '- src/a.ts\n')

      const eslint = createYamlValidationEslint(tempDir)
      const [rootResult] = await eslint.lintFiles([QUALITY_RATCHET_FILENAME])
      expect(rootResult?.messages.some(m => m.message.includes('root must be a YAML mapping'))).toBe(true)

      await writeTempFile(tempDir, QUALITY_RATCHET_FILENAME, [
        'eslint-comments/no-use: src/a.ts',
        'other/rule:',
        '  - ../escape.ts',
        '',
      ].join('\n'))
      const [bodyResult] = await eslint.lintFiles([QUALITY_RATCHET_FILENAME])
      const messages = bodyResult?.messages.map(m => m.message) ?? []
      expect(messages.some(msg => msg.includes('must be a YAML sequence'))).toBe(true)
      expect(messages.some(msg => msg.includes('normalized repo-relative file path'))).toBe(true)
    })
  })
})

describe('loadQualityRatchetForConfig and createRatchetExemptionConfigs', () => {
  test('loads valid files gracefully and returns empty object on missing or broken YAML', async () => {
    await withTempDir(async (tempDir) => {
      const missingPath = path.join(tempDir, 'missing.yaml')
      expect(loadQualityRatchetForConfig(missingPath)).toEqual({})

      const brokenPath = await writeTempFile(tempDir, 'broken.yaml', 'a:\n  - [bad\n')
      expect(loadQualityRatchetForConfig(brokenPath)).toEqual({})

      const validPath = await writeTempFile(tempDir, 'valid.yaml', [
        'eslint-comments/no-use:',
        '  - src/a.ts',
        '  - src/a.ts',
        '  - ../ignored.ts',
        'empty/rule: []',
        '',
      ].join('\n'))
      expect(loadQualityRatchetForConfig(validPath)).toEqual({
        'eslint-comments/no-use': ['src/a.ts'],
      })
    })
  })

  test('exempts listed files while keeping rules enforced on unlisted files', async () => {
    await withTempDir(async (tempDir) => {
      await writeTempFile(tempDir, 'src/exempt.ts', 'export const a = (1 as number)\n')
      await writeTempFile(tempDir, 'src/unlisted.ts', 'export const b = (2 as number)\n')

      const exemptions = {
        '@typescript-eslint/consistent-type-assertions': ['src/exempt.ts'],
        'empty/rule': [],
      }
      const exemptionConfigs = createRatchetExemptionConfigs(exemptions)
      expect(exemptionConfigs).toHaveLength(1)

      const eslint = new ESLint({
        cwd: tempDir,
        overrideConfigFile: true,
        overrideConfig: [
          ...createTsBaseConfigs(),
          ...exemptionConfigs,
        ],
      })

      const results = await eslint.lintFiles(['src/exempt.ts', 'src/unlisted.ts'])
      const exemptMessages = results.find(r => r.filePath.endsWith('exempt.ts'))?.messages ?? []
      const unlistedMessages = results.find(r => r.filePath.endsWith('unlisted.ts'))?.messages ?? []

      expect(exemptMessages.filter(m => m.ruleId === '@typescript-eslint/consistent-type-assertions')).toHaveLength(0)
      expect(unlistedMessages.filter(m => m.ruleId === '@typescript-eslint/consistent-type-assertions')).toHaveLength(1)
    })
  })
})

describe('findStaleExemptions', () => {
  test('returns empty list when all exempted files still violate their exempted rule', async () => {
    await withTempDir(async (tempDir) => {
      await writeTempFile(
        tempDir,
        'src/with-disable.ts',
        '// eslint-disable-next-line no-console -- existing\nconsole.log(1)\n',
      )
      await writeTempFile(tempDir, 'src/with-cast.ts', 'export const n = (1 as number)\n')

      const exemptions = {
        '@typescript-eslint/consistent-type-assertions': ['src/with-cast.ts'],
        'eslint-comments/no-use': ['src/with-disable.ts'],
      }
      const stale = await findStaleExemptions(exemptions, tempDir, {
        overrideConfigFile: true,
        baseConfig: [
          ...createTsBaseConfigs(),
          ...createRatchetExemptionConfigs(exemptions),
        ],
      })

      expect(stale).toEqual([])
    })
  })

  test('detects stale exemptions and preserves rule options when re-enabling rules', async () => {
    await withTempDir(async (tempDir) => {
      // eslint-enable is permitted by eslint-comments/no-use options in createTsBaseConfigs(),
      // so a file containing only eslint-enable must be flagged as stale rather than active.
      await writeTempFile(tempDir, 'src/enable-only.ts', '/* eslint-enable */\nexport const x = 1\n')
      await writeTempFile(tempDir, 'src/clean.ts', 'export const y = 2\n')
      await writeTempFile(
        tempDir,
        'src/still-dirty.ts',
        '// eslint-disable-next-line no-console -- needed\nconsole.log(1)\n',
      )

      const exemptions = {
        '@typescript-eslint/consistent-type-assertions': ['src/clean.ts'],
        'eslint-comments/no-use': ['src/enable-only.ts', 'src/still-dirty.ts'],
      }
      const stale = await findStaleExemptions(exemptions, tempDir, {
        overrideConfigFile: true,
        baseConfig: [
          ...createTsBaseConfigs(),
          ...createRatchetExemptionConfigs(exemptions),
        ],
      })

      expect(stale).toEqual([
        { ruleId: '@typescript-eslint/consistent-type-assertions', file: 'src/clean.ts' },
        { ruleId: 'eslint-comments/no-use', file: 'src/enable-only.ts' },
      ])
    })
  })
})
