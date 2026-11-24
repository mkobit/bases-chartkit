import * as fs from 'node:fs'
import * as path from 'node:path'
import type { RuleDefinition } from '@eslint/core'
import type { ESLint, Linter } from 'eslint'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'

export const QUALITY_RATCHET_FILENAME = 'quality-ratchet.yaml'

export type QualityRatchetExemptions = Readonly<Record<string, readonly string[]>>

export interface QualityRatchetParseSuccess {
  readonly ok: true
  readonly exemptions: QualityRatchetExemptions
}

export interface QualityRatchetParseFailure {
  readonly ok: false
  readonly error: string
}

export type QualityRatchetParseResult = QualityRatchetParseSuccess | QualityRatchetParseFailure

export interface StaleExemption {
  readonly ruleId: string
  readonly file: string
}

const VALID_EXEMPTIONS_MESSAGES = {
  invalidRoot: 'quality-ratchet.yaml root must be a YAML mapping of ESLint rule IDs to file lists.',
  invalidRuleKey: 'Exemption key must be a non-empty ESLint rule ID string.',
  duplicateRule: 'Duplicate exemption rule "{{ruleId}}".',
  invalidFileList: 'Exemption entry for "{{ruleId}}" must be a YAML sequence of file paths.',
  invalidFilePath:
    'Exemption path for "{{ruleId}}" must be a normalized repo-relative file path string.',
  duplicateFile: 'Duplicate exempted file "{{file}}" under "{{ruleId}}".',
  missingFile: 'Exempted file "{{file}}" under "{{ruleId}}" does not exist on disk.',
} as const

type ValidExemptionsMessageId = keyof typeof VALID_EXEMPTIONS_MESSAGES

interface YamlNode {
  readonly type: string
}

interface YamlScalar extends YamlNode {
  readonly type: 'YAMLScalar'
  readonly value: unknown
}

interface YamlSequence extends YamlNode {
  readonly type: 'YAMLSequence'
  readonly entries: readonly (YamlNode | null)[]
}

interface YamlPair extends YamlNode {
  readonly type: 'YAMLPair'
  readonly key: YamlNode | null
  readonly value: YamlNode | null
}

interface YamlMapping extends YamlNode {
  readonly type: 'YAMLMapping'
  readonly pairs: readonly YamlPair[]
}

interface YamlDocument extends YamlNode {
  readonly type: 'YAMLDocument'
  readonly content: YamlNode | null
}

const qualityRatchetSchema = z.record(z.string().min(1), z.array(z.string().min(1)))

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isYamlNode(value: unknown): value is YamlNode {
  return isRecord(value) && typeof value.type === 'string'
}

function isYamlDocument(value: unknown): value is YamlDocument {
  return isYamlNode(value) && value.type === 'YAMLDocument' && 'content' in value
}

function isYamlMapping(value: unknown): value is YamlMapping {
  return (
    isYamlNode(value) &&
    value.type === 'YAMLMapping' &&
    'pairs' in value &&
    Array.isArray(value.pairs)
  )
}

function isYamlSequence(value: unknown): value is YamlSequence {
  return (
    isYamlNode(value) &&
    value.type === 'YAMLSequence' &&
    'entries' in value &&
    Array.isArray(value.entries)
  )
}

function isYamlScalar(value: unknown): value is YamlScalar {
  return isYamlNode(value) && value.type === 'YAMLScalar' && 'value' in value
}

export function isValidRepoRelativeFilePath(filePath: string): boolean {
  if (filePath.length === 0 || filePath !== filePath.trim()) {
    return false
  }
  if (path.isAbsolute(filePath) || filePath.includes('\\') || filePath.includes('\0')) {
    return false
  }
  const segments = filePath.split('/')
  return segments.every(segment => segment.length > 0 && segment !== '.' && segment !== '..')
}

export function parseQualityRatchetYaml(content: string): QualityRatchetParseResult {
  try {
    const parsed: unknown = parseYaml(content)
    if (parsed === null || parsed === undefined) {
      return { ok: true, exemptions: {} }
    }
    const validated = qualityRatchetSchema.safeParse(parsed)
    if (!validated.success) {
      const details = validated.error.issues
        .map(issue => {
          const issuePath = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
          return `${issuePath}${issue.message}`
        })
        .join('; ')
      return { ok: false, error: `Invalid ${QUALITY_RATCHET_FILENAME}: ${details}` }
    }
    return { ok: true, exemptions: validated.data }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Failed to parse ${QUALITY_RATCHET_FILENAME}: ${message}` }
  }
}

export function loadQualityRatchetForConfig(filePath: string): QualityRatchetExemptions {
  if (!fs.existsSync(filePath)) {
    return {}
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed: unknown = parseYaml(raw)
    if (!isRecord(parsed)) {
      return {}
    }
    const entries = Object.entries(parsed).flatMap(
      ([ruleId, value]): readonly (readonly [string, readonly string[]])[] => {
        if (ruleId.trim().length === 0 || !Array.isArray(value)) {
          return []
        }
        const validFiles = [
          ...new Set(
            value.filter(
              (item): item is string =>
                typeof item === 'string' && isValidRepoRelativeFilePath(item),
            ),
          ),
        ]
        return validFiles.length > 0 ? [[ruleId, validFiles]] : []
      },
    )
    return Object.fromEntries(entries)
  } catch {
    // Allow ESLint to finish loading config so yml/valid-exemptions rules report YAML syntax/format errors directly.
    return {}
  }
}

export function validateQualityRatchetEntries(
  exemptions: QualityRatchetExemptions,
  rootDir: string,
): readonly string[] {
  const errors: string[] = []
  for (const [ruleId, files] of Object.entries(exemptions)) {
    if (ruleId.trim().length === 0) {
      errors.push('Exemption rule key must be non-empty.')
      continue
    }
    const seenFiles = new Set<string>()
    for (const file of files) {
      if (!isValidRepoRelativeFilePath(file)) {
        errors.push(
          `Invalid file path "${file}" under "${ruleId}": must be a normalized repo-relative path.`,
        )
        continue
      }
      if (seenFiles.has(file)) {
        errors.push(`Duplicate exempted file "${file}" under "${ruleId}".`)
        continue
      }
      seenFiles.add(file)
      const stats = fs.statSync(path.resolve(rootDir, file), { throwIfNoEntry: false })
      if (!stats?.isFile()) {
        errors.push(`Exempted file "${file}" under "${ruleId}" does not exist on disk.`)
      }
    }
  }
  return errors
}

export function createRatchetExemptionConfigs(
  exemptions: QualityRatchetExemptions,
): Linter.Config[] {
  return Object.entries(exemptions)
    .filter(([, files]) => files.length > 0)
    .map(([ruleId, files]) => ({
      name: `quality-ratchet/${ruleId}`,
      files: [...files],
      rules: {
        [ruleId]: 'off',
      },
    }))
}

function resolveYamlRootDir(
  physicalFilename: string,
  filename: string,
  defaultRootDir: string,
): string {
  if (path.isAbsolute(physicalFilename)) {
    return path.dirname(physicalFilename)
  }
  if (path.isAbsolute(filename)) {
    return path.dirname(filename)
  }
  return defaultRootDir
}

function createValidExemptionsRule(defaultRootDir: string): RuleDefinition {
  return {
    meta: {
      type: 'problem',
      docs: {
        description:
          'Validate quality-ratchet.yaml structure, path uniqueness, and file existence on disk',
      },
      messages: VALID_EXEMPTIONS_MESSAGES,
      schema: [],
    },
    create(context) {
      const report = (
        node: YamlNode,
        messageId: ValidExemptionsMessageId,
        data?: Readonly<Record<string, string>>,
      ): void => {
        context.report({ node, messageId, data })
      }

      return {
        YAMLDocument(rawNode: unknown): void {
          if (!isYamlDocument(rawNode) || rawNode.content === null) {
            return
          }
          if (!isYamlMapping(rawNode.content)) {
            report(rawNode.content, 'invalidRoot')
            return
          }

          const rootDir = resolveYamlRootDir(
            context.physicalFilename,
            context.filename,
            defaultRootDir,
          )
          const seenRules = new Set<string>()

          for (const pair of rawNode.content.pairs) {
            if (
              !isYamlScalar(pair.key) ||
              typeof pair.key.value !== 'string' ||
              pair.key.value.trim().length === 0
            ) {
              report(pair.key ?? pair, 'invalidRuleKey')
              continue
            }

            const ruleId = pair.key.value
            if (seenRules.has(ruleId)) {
              report(pair.key, 'duplicateRule', { ruleId })
            } else {
              seenRules.add(ruleId)
            }

            if (!isYamlSequence(pair.value)) {
              report(pair.value ?? pair, 'invalidFileList', { ruleId })
              continue
            }

            const seenFiles = new Set<string>()
            for (const entry of pair.value.entries) {
              if (
                !isYamlScalar(entry) ||
                typeof entry.value !== 'string' ||
                !isValidRepoRelativeFilePath(entry.value)
              ) {
                report(entry ?? pair.value, 'invalidFilePath', { ruleId })
                continue
              }

              const file = entry.value
              if (seenFiles.has(file)) {
                report(entry, 'duplicateFile', { file, ruleId })
                continue
              }
              seenFiles.add(file)

              const stats = fs.statSync(path.resolve(rootDir, file), { throwIfNoEntry: false })
              if (!stats?.isFile()) {
                report(entry, 'missingFile', { file, ruleId })
              }
            }
          }
        },
      }
    },
  }
}

export function createQualityRatchetYamlPlugin(defaultRootDir: string): ESLint.Plugin {
  return {
    meta: {
      name: 'quality-ratchet',
    },
    rules: {
      'valid-exemptions': createValidExemptionsRule(defaultRootDir),
    },
  }
}
