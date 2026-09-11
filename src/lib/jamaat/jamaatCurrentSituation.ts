/**
 * Jamaat-wide current organisational situation — five Admin people metrics.
 * Type + guard only. Computation lives in computeJamaatCurrentSituation.ts
 * so Firestore hydrate can import the type without peopleStore.
 */

export const JAMAAT_CURRENT_SITUATION_DOC_ID = 'jamaatCurrentSituation'

export type JamaatCurrentSituationCounts = {
  rukns: number
  aRukns: number
  karkuns: number
  muttafiqeen: number
  connections: number
}

export type JamaatCurrentSituation = JamaatCurrentSituationCounts & {
  generatedAt: string
}

export function isJamaatCurrentSituation(value: unknown): value is JamaatCurrentSituation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.rukns === 'number' &&
    typeof row.aRukns === 'number' &&
    typeof row.karkuns === 'number' &&
    typeof row.muttafiqeen === 'number' &&
    typeof row.connections === 'number' &&
    typeof row.generatedAt === 'string' &&
    row.generatedAt.trim().length > 0
  )
}
