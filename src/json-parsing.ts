import { z } from 'zod'

export const jsonParsed = <T extends z.ZodType>(schema: T) =>
  z
    .string()
    .transform((str, ctx) => {
      try {
        return JSON.parse(str)
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Invalid JSON' })
        return z.NEVER
      }
    })
    .pipe(schema)
