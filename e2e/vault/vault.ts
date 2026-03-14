import * as fs from 'node:fs/promises'

import * as path from 'node:path'
import type { NoteDefinition } from './schema'
import { serializeFrontmatter } from './serializer'

export class VaultBuilder {
  private constructor(private readonly notes: readonly NoteDefinition[]) {}

  static create(): VaultBuilder {
    return new VaultBuilder([])
  }

  getNotes(): readonly NoteDefinition[] {
    return this.notes
  }

  withNote(note: NoteDefinition): VaultBuilder {
    return new VaultBuilder([...this.notes, note])
  }

  withNotes(notes: readonly NoteDefinition[]): VaultBuilder {
    return new VaultBuilder([...this.notes, ...notes])
  }
}

export async function writeNoteToVault(baseDir: string, note: NoteDefinition): Promise<void | Error> {
  try {
    const fullPath = path.join(baseDir, note.relativePath.dir, note.relativePath.base)
    const parentDir = path.dirname(fullPath)

    await fs.mkdir(parentDir, { recursive: true })

    const frontmatterStr = serializeFrontmatter(note.frontmatter)
    const content = note.body !== undefined ? `${frontmatterStr}\n${note.body}` : frontmatterStr

    await fs.writeFile(fullPath, content, 'utf-8')
  }
  catch (error) {
    if (error instanceof Error) {
      return error
    }
    return new Error(String(error))
  }
}
