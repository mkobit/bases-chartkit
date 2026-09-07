import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { TOML, YAML } from 'bun'
import { z } from 'zod'
import { kitSpecSchema, sbxEnvV1Schema } from './sbx-schemas'

const FORBIDDEN_KEYS = [
  'secrets',
  'bindings',
  'registries',
  'additionalWorkspaces',
  'localWorkspaces',
] as const

const REQUIRED_PORTS = [6080, 9222, 5173] as const
const filesToCheck = ['.sbx/.sbxenv.yaml', '.sbx/.sbxenv.agy.yaml'] as const
const kitSpecFile = '.sbx/kit/spec.yaml'
const kitDir = '.sbx/kit'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseYaml(file: string): unknown {
  const raw = readFileSync(file, 'utf8')
  try {
    return YAML.parse(raw)
  }
  catch (error) {
    console.error(`Failed to parse YAML in ${file}:`, error)
    return null
  }
}

function checkKitWithSbxIfAvailable(dir: string): void {
  if (Bun.which('sbx') !== null) {
    console.log(`Running host 'sbx kit validate ${dir}'...`)
    execSync(`sbx kit validate ${dir}`, { stdio: 'inherit' })
  }
}

function checkKitSpec(file: string): boolean {
  if (!existsSync(file)) {
    console.error(`Missing expected kit spec file: ${file}`)
    return false
  }

  const parsed = parseYaml(file)

  if (!isRecord(parsed)) {
    console.error(`File ${file} does not contain a YAML object`)
    return false
  }

  const result = kitSpecSchema.safeParse(parsed)
  if (!result.success) {
    console.error(`Validation failed for ${file}:`, z.treeifyError(result.error))
    return false
  }

  console.log(
    `✓ ${file} is valid (${result.data.name}, schemaVersion: ${result.data.schemaVersion ?? 'unknown'})`,
  )
  return true
}

function checkFile(file: string): boolean {
  if (!existsSync(file)) {
    console.error(`Missing expected environment file: ${file}`)
    return false
  }

  const parsed = parseYaml(file)

  if (!isRecord(parsed)) {
    console.error(`File ${file} does not contain a YAML object`)
    return false
  }

  const foundForbidden = FORBIDDEN_KEYS.filter(key => key in parsed)
  if (foundForbidden.length > 0) {
    console.error(
      `File ${file} contains forbidden tracked properties: ${foundForbidden.join(', ')}`,
    )
    return false
  }

  const result = sbxEnvV1Schema.safeParse(parsed)
  if (!result.success) {
    console.error(`Validation failed for ${file}:`, z.treeifyError(result.error))
    return false
  }

  if (result.data.workspace && !result.data.workspace.clone) {
    console.error(`File ${file} must have workspace.clone: true`)
    return false
  }

  const hasKit = result.data.kit === './kit' || (result.data.kits !== undefined && result.data.kits.includes('./kit'))
  if (!hasKit) {
    console.error(`File ${file} must reference "./kit" in kit or kits`)
    return false
  }

  const declaredSandboxPorts = new Set(
    (result.data.ports ?? []).map(port => port.sandbox),
  )
  for (const requiredPort of REQUIRED_PORTS) {
    if (!declaredSandboxPorts.has(requiredPort)) {
      console.error(
        `File ${file} must forward required sandbox port ${requiredPort}`,
      )
      return false
    }
  }

  console.log(
    `✓ ${file} is valid (${result.data.name ?? 'unnamed'}, agent: ${result.data.agent ?? 'unknown'})`,
  )
  return true
}

function checkToolchainParity(): boolean {
  const miseFile = 'mise.toml'
  const pkgFile = 'package.json'
  const ciFile = '.github/workflows/ci.yml'
  const openspecFile = '.github/workflows/openspec.yml'
  const setupEnvFile = '.github/actions/setup-env/action.yml'

  if (!existsSync(miseFile) || !existsSync(pkgFile) || !existsSync(kitSpecFile)) {
    console.error('Missing required config files for toolchain parity check')
    return false
  }

  const miseRaw = readFileSync(miseFile, 'utf8')
  const miseParsed = TOML.parse(miseRaw)
  if (!isRecord(miseParsed)) {
    console.error(`Failed to parse ${miseFile} as an object`)
    return false
  }

  const miseTools = isRecord(miseParsed['tools']) ? miseParsed['tools'] : undefined
  const miseBun = typeof miseTools?.['bun'] === 'string' ? miseTools['bun'] : undefined
  const miseBeads = typeof miseTools?.['github:gastownhall/beads'] === 'string'
    ? miseTools['github:gastownhall/beads']
    : undefined

  if (miseBun === undefined) {
    console.error(`${miseFile} missing tools.bun definition`)
    return false
  }

  const pkgRaw = readFileSync(pkgFile, 'utf8')
  const pkgParsed = JSON.parse(pkgRaw)
  if (!isRecord(pkgParsed)) {
    console.error(`Failed to parse ${pkgFile} as an object`)
    return false
  }

  if (typeof pkgParsed['packageManager'] === 'string') {
    const pkgManagerBun = pkgParsed['packageManager'].replace(/^bun@/, '')
    if (pkgManagerBun !== miseBun) {
      console.error(
        `Version mismatch: ${pkgFile} packageManager (${pkgParsed['packageManager']}) does not match ${miseFile} bun (${miseBun})`,
      )
      return false
    }
  }

  const pkgEngines = isRecord(pkgParsed['engines']) ? pkgParsed['engines'] : undefined
  if (typeof pkgEngines?.['bun'] === 'string') {
    if (pkgEngines['bun'] !== miseBun) {
      console.error(
        `Version mismatch: ${pkgFile} engines.bun (${pkgEngines['bun']}) does not match ${miseFile} bun (${miseBun})`,
      )
      return false
    }
  }

  const parsedKit = parseYaml(kitSpecFile)
  if (!isRecord(parsedKit)) {
    console.error(`Failed to parse ${kitSpecFile} for parity check`)
    return false
  }

  const setupObj = isRecord(parsedKit['setup']) ? parsedKit['setup'] : undefined
  const installArray = Array.isArray(setupObj?.['install']) ? setupObj['install'] : []
  const installCommands = installArray
    .map(step => (isRecord(step) && typeof step['command'] === 'string' ? step['command'] : ''))
    .join('\n')

  const kitBunMatch = installCommands.match(/bun@([0-9]+\.[0-9]+\.[0-9]+)/)
  if (kitBunMatch === null || kitBunMatch[1] === undefined) {
    console.error(
      `${kitSpecFile} does not declare an explicit bun version (expected bun@<semver>)`,
    )
    return false
  }

  if (kitBunMatch[1] !== miseBun) {
    console.error(
      `Version mismatch: ${kitSpecFile} declares bun@${kitBunMatch[1]}, but ${miseFile} declares ${miseBun}`,
    )
    return false
  }

  if (miseBeads !== undefined) {
    const kitBeadsMatch = installCommands.match(
      /(?:github:gastownhall\/beads|beads)@([0-9]+\.[0-9]+\.[0-9]+)/,
    )
    if (kitBeadsMatch === null || kitBeadsMatch[1] === undefined) {
      console.error(
        `${kitSpecFile} does not declare an explicit beads version (expected beads@<semver>)`,
      )
      return false
    }
    if (kitBeadsMatch[1] !== miseBeads) {
      console.error(
        `Version mismatch: ${kitSpecFile} declares beads@${kitBeadsMatch[1]}, but ${miseFile} declares ${miseBeads}`,
      )
      return false
    }
  }

  if (existsSync(ciFile)) {
    const ciParsed = parseYaml(ciFile)
    if (isRecord(ciParsed)) {
      const ciEnv = isRecord(ciParsed['env']) ? ciParsed['env'] : undefined
      const ciBun = typeof ciEnv?.['BUN_VERSION'] === 'string' ? ciEnv['BUN_VERSION'] : undefined
      if (ciBun !== miseBun) {
        console.error(
          `Version mismatch: ${ciFile} env.BUN_VERSION (${ciBun ?? 'missing'}) does not match ${miseFile} bun (${miseBun})`,
        )
        return false
      }
    }
  }

  if (existsSync(openspecFile)) {
    const openspecParsed = parseYaml(openspecFile)
    if (isRecord(openspecParsed)) {
      const openspecEnv = isRecord(openspecParsed['env']) ? openspecParsed['env'] : undefined
      const openspecBun = typeof openspecEnv?.['BUN_VERSION'] === 'string' ? openspecEnv['BUN_VERSION'] : undefined
      if (openspecBun !== miseBun) {
        console.error(
          `Version mismatch: ${openspecFile} env.BUN_VERSION (${openspecBun ?? 'missing'}) does not match ${miseFile} bun (${miseBun})`,
        )
        return false
      }
    }
  }

  if (existsSync(setupEnvFile)) {
    const setupEnvParsed = parseYaml(setupEnvFile)
    if (isRecord(setupEnvParsed)) {
      const inputs = isRecord(setupEnvParsed['inputs']) ? setupEnvParsed['inputs'] : undefined
      const bunInput = isRecord(inputs?.['bun-version']) ? inputs['bun-version'] : undefined
      const defaultBun = typeof bunInput?.['default'] === 'string' ? bunInput['default'] : undefined
      if (defaultBun !== miseBun) {
        console.error(
          `Version mismatch: ${setupEnvFile} inputs.bun-version.default (${defaultBun ?? 'missing'}) does not match ${miseFile} bun (${miseBun})`,
        )
        return false
      }
    }
  }

  console.log(
    `✓ Toolchain parity verified: bun@${miseBun} (mise, sbx, GitHub Actions), beads@${miseBeads ?? 'unspecified'}`,
  )
  return true
}

const kitPassed = checkKitSpec(kitSpecFile)
const envPassed = filesToCheck.every(checkFile)
const parityPassed = checkToolchainParity()

if (!kitPassed || !envPassed || !parityPassed) {
  process.exit(1)
}

// When running in an environment where sbx CLI is installed, also run native sbx kit validate
checkKitWithSbxIfAvailable(kitDir)
