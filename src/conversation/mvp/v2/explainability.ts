/**
 * Shared explainability helpers — never invent scores; cite existing fields.
 */

import type { ExplainReason } from './types'

export function reason(
  id: string,
  label: string,
  sourceField: string,
): ExplainReason {
  return Object.freeze({ id, label, sourceField })
}

export function formatWhy(reasons: readonly ExplainReason[]): string {
  if (reasons.length === 0) return ''
  return ['کیوں؟', ...reasons.map((r) => `• ${r.label}`)].join('\n')
}
