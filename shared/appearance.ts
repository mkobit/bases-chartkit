import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// Obsidian's own appearance.json vocabulary for the two built-in base
// themes -- "obsidian" is the dark scheme, "moonstone" is the light scheme.
export const OBSIDIAN_THEME_BY_MODE = { dark: 'obsidian', light: 'moonstone' } as const
export type ViewMode = keyof typeof OBSIDIAN_THEME_BY_MODE

// Presets a copied (not-yet-launched) vault's color scheme before Obsidian
// ever reads appearance.json. Must run against a vault copy that hasn't
// been launched yet -- writing after launch()'s own copy:true would race
// Obsidian actually reading it.
export async function applyViewMode(vaultPath: string, mode: ViewMode): Promise<void> {
  const appearancePath = path.join(vaultPath, '.obsidian', 'appearance.json')
  const existingRaw = await fs.readFile(appearancePath, 'utf8').catch(() => '{}')
  const existing: Record<string, unknown> = JSON.parse(existingRaw)
  await fs.writeFile(
    appearancePath,
    JSON.stringify({ ...existing, theme: OBSIDIAN_THEME_BY_MODE[mode] }),
  )
}
