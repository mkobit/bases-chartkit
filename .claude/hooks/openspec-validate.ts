#!/usr/bin/env bun
import { spawnSync } from 'node:child_process'
import { z } from 'zod'

const payloadSchema = z.object({
  tool_input: z.object({
    file_path: z.string(),
  }).partial(),
}).partial()

async function main(): Promise<void> {
  const raw = await new Response(Bun.stdin.stream()).text()
  const parsed = payloadSchema.safeParse(raw.trim().length > 0 ? JSON.parse(raw) : {})
  const filePath = parsed.success ? parsed.data.tool_input?.file_path : undefined
  if (filePath === undefined) {
    return
  }

  const match = /openspec\/changes\/([^/]+)\//.exec(filePath)
  const changeName = match?.[1]
  if (changeName === undefined || changeName === 'archive') {
    return
  }

  const result = spawnSync('bunx', ['openspec', 'validate', changeName, '--strict', '--type', 'change'], {
    encoding: 'utf-8',
  })

  if (result.status !== 0) {
    console.error(`openspec validate ${changeName} --strict failed:\n${result.stdout}${result.stderr}`)
    process.exit(2)
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
