/**
 * Narrow Rukn display-name directory for planning ذمہ دار labels.
 * Types only — computation lives in computeRuknNameDirectory.ts
 */

export const RUKN_NAME_DIRECTORY_DOC_ID = 'ruknNameDirectory'

export type RuknNameDirectoryEntry = {
  id: string
  name: string
}

export type RuknNameDirectory = {
  generatedAt: string
  entries: readonly RuknNameDirectoryEntry[]
}

export function ruknNameMapFromDirectory(
  directory: RuknNameDirectory | null | undefined,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of directory?.entries ?? []) {
    if (row.id && row.name) map.set(row.id, row.name)
  }
  return map
}

export function lookupRuknNameFromDirectory(
  directory: RuknNameDirectory | null | undefined,
  ruknId: string | undefined,
): string | null {
  const id = ruknId?.trim()
  if (!id) return null
  return ruknNameMapFromDirectory(directory).get(id) ?? null
}

export function isRuknNameDirectory(value: unknown): value is RuknNameDirectory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  if (typeof row.generatedAt !== 'string' || !row.generatedAt.trim()) return false
  if (!Array.isArray(row.entries)) return false
  return row.entries.every(
    (entry) =>
      entry &&
      typeof entry === 'object' &&
      typeof (entry as RuknNameDirectoryEntry).id === 'string' &&
      typeof (entry as RuknNameDirectoryEntry).name === 'string',
  )
}
