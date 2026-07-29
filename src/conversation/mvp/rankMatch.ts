/**
 * Search ranking — exact > startsWith > contains > related > light fuzzy.
 * No AI / NLP models.
 */

export type RankTier = 'exact' | 'startsWith' | 'contains' | 'related' | 'fuzzy' | 'none'

export type RankScore = {
  readonly score: number
  readonly tier: RankTier
}

function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const rows = a.length + 1
  const cols = b.length + 1
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0),
  )
  for (let i = 0; i < rows; i += 1) matrix[i]![0] = i
  for (let j = 0; j < cols; j += 1) matrix[0]![j] = j
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      )
    }
  }
  return matrix[a.length]![b.length]!
}

/** Best score for query against one field. */
export function rankField(query: string, field: string | null | undefined): RankScore {
  const q = normalize(query)
  const f = normalize(field ?? '')
  if (!q || !f) return { score: 0, tier: 'none' }

  if (f === q) return { score: 100, tier: 'exact' }
  if (f.startsWith(q)) return { score: 85, tier: 'startsWith' }
  if (f.includes(q)) return { score: 70, tier: 'contains' }

  const qTokens = q.split(' ').filter(Boolean)
  const fTokens = f.split(' ').filter(Boolean)
  if (qTokens.every((token) => fTokens.some((ft) => ft.includes(token) || token.includes(ft)))) {
    return { score: 55, tier: 'related' }
  }

  // Light spelling tolerance for single-token queries of length ≥ 4
  if (qTokens.length === 1 && q.length >= 4) {
    let best = Infinity
    for (const token of fTokens) {
      if (token.length < 3) continue
      best = Math.min(best, levenshtein(q, token))
      if (best <= 1) break
    }
    if (best <= 1) return { score: 45, tier: 'fuzzy' }
    if (best === 2 && q.length >= 5) return { score: 35, tier: 'fuzzy' }
  }

  return { score: 0, tier: 'none' }
}

/** Best score across candidate fields. */
export function rankFields(
  query: string,
  fields: readonly (string | null | undefined)[],
): RankScore {
  let best: RankScore = { score: 0, tier: 'none' }
  for (const field of fields) {
    const next = rankField(query, field)
    if (next.score > best.score) best = next
  }
  return best
}
