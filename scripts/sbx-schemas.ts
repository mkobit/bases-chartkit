/**
 * Docker Sandboxes (sbx) Zod schemas.
 *
 * References:
 * - Docker Sandboxes Kit Spec v2 (normative): https://github.com/docker/sbx-kits-contrib/blob/main/spec/SPEC-v2.md
 * - Docker Docs Kit Reference: https://docs.docker.com/ai/sandboxes/customize/kit-reference/
 * - Docker Docs Environment Files: https://docs.docker.com/ai/sandboxes/configuration/environment-files/
 */

import { z } from 'zod'

// --- Identifiers & Common Patterns ---

// Kit name: ^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$
export const kitNameRegex = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/
// Environment variable name: [A-Za-z_][A-Za-z0-9_]*
export const envVarNameRegex = /^[A-Za-z_][A-Za-z0-9_]*$/
// Dotted path for locked fields: ^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$
export const dottedPathRegex = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/

// --- Setup Blocks (v2) ---

export const setupInstallItemSchema = z
  .object({
    command: z.string().min(1),
    user: z.string().optional(),
    description: z.string().optional(),
  })
  .strict()

export const setupStartupItemSchema = z
  .object({
    command: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
    user: z.string().optional(),
    background: z.boolean().optional(),
    description: z.string().optional(),
    env: z.record(z.string(), z.string()).optional(),
  })
  .strict()

export const setupFileItemSchema = z
  .object({
    path: z.string().min(1),
    content: z.string(),
    mode: z.string().optional(),
    onlyIfMissing: z.boolean().optional(),
    description: z.string().optional(),
  })
  .strict()

export const setupSchema = z
  .object({
    install: z.array(setupInstallItemSchema).optional(),
    startup: z.array(setupStartupItemSchema).optional(),
    files: z.array(setupFileItemSchema).optional(),
  })
  .strict()

// --- Build Steps (v2 build block) ---

export const buildStepSchema = z
  .object({
    name: z.string().optional(),
    command: z.string().optional(),
    run: z.string().optional(),
  })
  .strict()

export const buildSchema = z
  .object({
    context: z.string().optional(),
    dockerfile: z.string().optional(),
    args: z.record(z.string(), z.string()).optional(),
    target: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    steps: z.array(buildStepSchema).optional(),
  })
  .strict()

// --- Permissions (v2) ---

export const permissionsNetworkSchema = z
  .object({
    allow: z.array(z.string().min(1)).optional(),
    deny: z.array(z.string().min(1)).optional(),
  })
  .strict()

export const permissionsSchema = z
  .object({
    network: permissionsNetworkSchema.optional(),
  })
  .strict()

// --- Environment (v2) ---

export const environmentSchema = z
  .object({
    variables: z
      .record(z.string().regex(envVarNameRegex), z.string())
      .optional(),
  })
  .strict()

// --- Ports (v2) ---

export const kitPortSchema = z
  .object({
    container: z.number().int().min(1).max(65535),
    protocol: z.enum(['tcp', 'udp']).optional(),
    name: z.string().optional(),
  })
  .strict()

// --- Agent Instructions (v2) ---

export const agentInstructionsSchema = z
  .object({
    filename: z.string().optional(),
    content: z.string().optional(),
  })
  .strict()

// --- Credentials (v2) ---

export const apiKeyInjectSchema = z
  .object({
    domain: z.string().min(1),
    header: z.string().optional(),
    format: z.string().optional(),
    scheme: z.enum(['bearer', 'basic']).optional(),
    username: z.string().optional(),
  })
  .strict()

export const credentialApiKeySchema = z
  .object({
    name: z.string().min(1),
    proxyManaged: z.boolean().optional(),
    inject: z.array(apiKeyInjectSchema).optional(),
  })
  .strict()

export const credentialOAuthSchema = z
  .object({
    tokenEndpoint: z
      .object({
        host: z.string().min(1),
        path: z.string().min(1),
      })
      .strict()
      .optional(),
    sentinels: z
      .object({
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
      })
      .strict()
      .optional(),
    credentialFile: z
      .object({
        path: z.string().min(1),
        structure: z.record(z.string(), z.unknown()).optional(),
        template: z.string().optional(),
      })
      .strict()
      .optional(),
    resourceHosts: z.array(z.string()).optional(),
    skipIfEnv: z.boolean().optional(),
    responseFields: z.record(z.string(), z.string()).optional(),
    passthrough: z.boolean().optional(),
  })
  .strict()

export const credentialItemSchema = z
  .object({
    service: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean().optional(),
    provider: z.string().optional(),
    apiKey: credentialApiKeySchema.optional(),
    oauth: credentialOAuthSchema.optional(),
  })
  .strict()

// --- Volumes (v2) ---

export const volumeItemSchema = z
  .object({
    path: z.string().min(1),
    type: z.enum(['tmpfs', 'bind']).optional(),
    source: z.string().optional(),
    readOnly: z.boolean().optional(),
  })
  .strict()

// --- Kit Spec v2 (Normative SPEC-v2) ---

const commonKitFields = {
  schemaVersion: z.union([z.literal('2'), z.literal(2)]),
  name: z.string().regex(kitNameRegex),
  version: z.union([z.string(), z.number()]).optional(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  sourceURL: z.url().optional(),
  licenses: z.array(z.string().min(1)).optional(),
  locked: z.array(z.string().regex(dottedPathRegex)).optional(),
  security: z
    .object({
      privileged: z.boolean().optional(),
    })
    .strict()
    .optional(),
  permissions: permissionsSchema.optional(),
  ports: z.array(kitPortSchema).optional(),
  credentials: z.array(credentialItemSchema).optional(),
  environment: environmentSchema.optional(),
  setup: setupSchema.optional(),
  volumes: z.array(volumeItemSchema).optional(),
  agentInstructions: agentInstructionsSchema.optional(),
  base: z.string().optional(),
  build: buildSchema.optional(),
  runtime: z.record(z.string(), z.unknown()).optional(),
}

export const kitMixinSpecV2Schema = z
  .object({
    ...commonKitFields,
    kind: z.literal('mixin').optional(),
    requires: z
      .object({
        agent: z.string().regex(kitNameRegex).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export const kitSandboxSpecV2Schema = z
  .object({
    ...commonKitFields,
    kind: z.literal('sandbox'),
    sandbox: z
      .object({
        image: z.string().optional(),
        entrypoint: z.array(z.string().min(1)).optional(),
        command: z
          .union([
            z.array(z.string()),
            z
              .object({
                default: z.array(z.string()).optional(),
                interactive: z.array(z.string()).optional(),
              })
              .strict(),
          ])
          .optional(),
        resources: z
          .object({
            cpu: z.number().nonnegative().optional(),
            memory: z.string().optional(),
            gpu: z.string().optional(),
          })
          .strict()
          .optional(),
        build: buildSchema.optional(),
      })
      .strict(),
    extends: z.string().optional(),
    mixins: z.array(z.string()).optional(),
  })
  .strict()

export const kitSpecV2Schema = z.union([
  kitSandboxSpecV2Schema,
  kitMixinSpecV2Schema,
])

// --- Legacy Kit Spec v1 ---

export const kitSpecV1Schema = z
  .object({
    schemaVersion: z.union([z.literal('1'), z.literal(1)]).optional(),
    schema_version: z.union([z.literal('1'), z.literal(1)]).optional(),
    kind: z.enum(['agent', 'mixin']).optional(),
    name: z.string().min(1),
    version: z.union([z.string(), z.number()]).optional(),
    description: z.string().optional(),
    network: z
      .object({
        allowedDomains: z.array(z.string()).optional(),
        deniedDomains: z.array(z.string()).optional(),
      })
      .optional(),
    environment: z.record(z.string(), z.string()).optional(),
    commands: z
      .object({
        install: z.array(z.string()).optional(),
        startup: z.array(z.string()).optional(),
        initFiles: z.array(z.record(z.string(), z.string())).optional(),
      })
      .optional(),
  })
  .loose()

export const kitSpecSchema = z.union([kitSpecV2Schema, kitSpecV1Schema])

// --- Environment File (sbxenv.yaml) ---

export const sbxEnvPortSchema = z
  .object({
    sandbox: z.number().int().min(1).max(65535),
    host: z.number().int().min(1).max(65535).optional(),
    protocol: z.enum(['tcp', 'tcp4', 'tcp6', 'udp', 'udp4', 'udp6']).optional(),
    hostIP: z.string().optional(),
  })
  .strict()

export const sbxEnvWorkspaceSchema = z
  .object({
    path: z.string().min(1),
    clone: z.boolean(),
  })
  .strict()

export const sbxEnvV1Schema = z
  .object({
    schemaVersion: z.union([z.literal('1'), z.literal(1)]).optional(),
    name: z.string().min(1).optional(),
    agent: z.string().min(1).optional(),
    workspace: sbxEnvWorkspaceSchema.optional(),
    kit: z.string().optional(),
    kits: z.array(z.string()).optional(),
    ports: z.array(sbxEnvPortSchema).optional(),
    env: z.record(z.string(), z.string()).optional(),
    setup_commands: z.array(z.string()).optional(),
  })
  .strict()
