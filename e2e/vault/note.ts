import * as path from 'node:path'
import type { FrontmatterValue, NoteDefinition } from './schema'

export const createNote = (
  relativePath: string,
  frontmatter: Readonly<Record<string, FrontmatterValue>>,
  body?: string,
): NoteDefinition => {
  const parsed = path.parse(relativePath)
  return {
    relativePath: {
      dir: parsed.dir,
      name: parsed.name,
      ext: parsed.ext,
      base: parsed.base,
    },
    frontmatter,
    body,
  }
}
