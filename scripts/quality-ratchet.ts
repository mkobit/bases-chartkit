#!/usr/bin/env bun
// Verifies quality-ratchet.yaml has valid entries and no stale exemptions.
// Each exempted file is re-linted with its exempted rule re-enabled ('error'),
// failing if any file no longer triggers that rule so exemptions ratchet down.
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { ESLint } from 'eslint'
import type { Linter } from 'eslint'
import {
  QUALITY_RATCHET_FILENAME,
  parseQualityRatchetYaml,
  validateQualityRatchetEntries,
} from '../shared/quality-ratchet'
import type { QualityRatchetExemptions, StaleExemption } from '../shared/quality-ratchet'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')

export interface QualityRatchetCheckResult {
  readonly ok: boolean
  readonly validationErrors: readonly string[]
  readonly staleExemptions: readonly StaleExemption[]
  readonly checkedRuleCount: number
  readonly checkedFileCount: number
}

export interface FindStaleExemptionsOptions {
  readonly overrideConfigFile?: string | true | null
  readonly baseConfig?: readonly Linter.Config[]
}

interface ExemptionInspectionResult {
  readonly staleExemptions: readonly StaleExemption[]
  readonly fatalErrors: readonly string[]
}

async function inspectExemptions(
  exemptions: QualityRatchetExemptions,
  rootDir: string,
  options?: FindStaleExemptionsOptions,
): Promise<ExemptionInspectionResult> {
  const entries = Object.entries(exemptions).filter(([, files]) => files.length > 0)
  const uniqueFiles = [...new Set(entries.flatMap(([, files]) => files))]

  if (uniqueFiles.length === 0) {
    return { staleExemptions: [], fatalErrors: [] }
  }

  const ruleRestoreConfigs: Linter.Config[] = entries.map(([ruleId, files]) => ({
    files: [...files],
    rules: {
      [ruleId]: 'error',
    },
  }))

  const overrideConfig: Linter.Config[] = options?.baseConfig
    ? [...options.baseConfig, ...ruleRestoreConfigs]
    : ruleRestoreConfigs

  const eslint = new ESLint({
    cwd: rootDir,
    overrideConfigFile: options?.overrideConfigFile,
    overrideConfig,
  })

  const results = await eslint.lintFiles(uniqueFiles)
  const ruleIdsByAbsPath = new Map<string, ReadonlySet<string>>()
  const fatalErrors: string[] = []

  for (const result of results) {
    const absPath = path.resolve(result.filePath)
    const fatalMessages = result.messages.filter(message => message.fatal === true)
    for (const fatalMessage of fatalMessages) {
      const relPath = path.relative(rootDir, absPath)
      fatalErrors.push(
        `${relPath}:${fatalMessage.line}:${fatalMessage.column}: ${fatalMessage.message}`,
      )
    }
    const triggeredRuleIds = new Set(
      result.messages
        .map(message => message.ruleId)
        .filter((ruleId): ruleId is string => ruleId !== null),
    )
    ruleIdsByAbsPath.set(absPath, triggeredRuleIds)
  }

  if (fatalErrors.length > 0) {
    return { staleExemptions: [], fatalErrors }
  }

  const staleExemptions: StaleExemption[] = []
  for (const [ruleId, files] of entries) {
    for (const file of files) {
      const triggered = ruleIdsByAbsPath.get(path.resolve(rootDir, file))
      if (!triggered?.has(ruleId)) {
        staleExemptions.push({ ruleId, file })
      }
    }
  }

  return { staleExemptions, fatalErrors: [] }
}

export async function findStaleExemptions(
  exemptions: QualityRatchetExemptions,
  rootDir: string,
  options?: FindStaleExemptionsOptions,
): Promise<readonly StaleExemption[]> {
  const { staleExemptions } = await inspectExemptions(exemptions, rootDir, options)
  return staleExemptions
}

export async function runQualityRatchet(
  rootDir: string,
  ratchetFilePath?: string,
): Promise<QualityRatchetCheckResult> {
  const targetPath = ratchetFilePath ?? path.join(rootDir, QUALITY_RATCHET_FILENAME)
  const content = await fs.readFile(targetPath, 'utf-8')
  const parsed = parseQualityRatchetYaml(content)

  if (!parsed.ok) {
    return {
      ok: false,
      validationErrors: [parsed.error],
      staleExemptions: [],
      checkedRuleCount: 0,
      checkedFileCount: 0,
    }
  }

  const validationErrors = validateQualityRatchetEntries(parsed.exemptions, rootDir)
  const nonEmptyEntries = Object.entries(parsed.exemptions).filter(([, files]) => files.length > 0)
  const uniqueFiles = new Set(nonEmptyEntries.flatMap(([, files]) => files))

  if (validationErrors.length > 0) {
    return {
      ok: false,
      validationErrors,
      staleExemptions: [],
      checkedRuleCount: nonEmptyEntries.length,
      checkedFileCount: uniqueFiles.size,
    }
  }

  const { staleExemptions, fatalErrors } = await inspectExemptions(parsed.exemptions, rootDir)
  if (fatalErrors.length > 0) {
    return {
      ok: false,
      validationErrors: fatalErrors,
      staleExemptions: [],
      checkedRuleCount: nonEmptyEntries.length,
      checkedFileCount: uniqueFiles.size,
    }
  }

  return {
    ok: staleExemptions.length === 0,
    validationErrors: [],
    staleExemptions,
    checkedRuleCount: nonEmptyEntries.length,
    checkedFileCount: uniqueFiles.size,
  }
}

async function main(): Promise<void> {
  const result = await runQualityRatchet(ROOT_DIR)

  if (result.ok) {
    console.log(
      `Quality ratchet OK: ${result.checkedRuleCount} rule(s), ${result.checkedFileCount} exempted file(s) verified.`,
    )
    return
  }

  if (result.validationErrors.length > 0) {
    console.error(
      `Quality ratchet validation failed:\n${result.validationErrors.map(error => `  - ${error}`).join('\n')}`,
    )
  }

  if (result.staleExemptions.length > 0) {
    const staleLines = result.staleExemptions
      .map(entry => `  - ${entry.ruleId}: ${entry.file}`)
      .join('\n')
    console.error(
      `Quality ratchet stale exemptions found (remove fixed files from ${QUALITY_RATCHET_FILENAME}):\n${staleLines}`,
    )
  }

  process.exit(1)
}

if (import.meta.main) {
  main().catch((err: unknown) => {
    console.error(
      'Fatal error checking quality ratchet:',
      err instanceof Error ? err.message : String(err),
    )
    process.exit(1)
  })
}
