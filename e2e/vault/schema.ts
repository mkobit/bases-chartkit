import { z } from 'zod'
import { Temporal } from 'temporal-polyfill'

export const FrontmatterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()).readonly(),
  z.instanceof(Temporal.PlainDate),
  z.instanceof(Temporal.Instant),
  z.instanceof(Temporal.PlainDateTime),
  z.instanceof(Temporal.ZonedDateTime),
])

export type FrontmatterValue = z.infer<typeof FrontmatterValueSchema>

export const PathSchema = z.object({
  dir: z.string(),
  name: z.string(),
  ext: z.string(),
  base: z.string(),
}).readonly()

export type Path = z.infer<typeof PathSchema>

export const NoteDefinitionSchema = z.object({
  relativePath: PathSchema,
  frontmatter: z.record(z.string(), FrontmatterValueSchema).readonly(),
  body: z.string().optional(),
}).readonly()

export type NoteDefinition = z.infer<typeof NoteDefinitionSchema>
