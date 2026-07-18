/**
 * Safe chronological compare for ISO / date-like strings.
 * Missing or non-string values sort last — never throw in render paths.
 */
export function compareIsoDateStringsDesc(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  const a = typeof left === 'string' ? left : ''
  const b = typeof right === 'string' ? right : ''
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return b.localeCompare(a)
}

export function compareIsoDateStringsAsc(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  return compareIsoDateStringsDesc(right, left)
}
