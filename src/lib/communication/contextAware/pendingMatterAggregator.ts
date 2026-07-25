/**
 * KC-0119 — PendingMatterAggregator
 */

import type { ContextAwarePendingMatter } from './types'

export function aggregatePendingMatters(
  matters: ContextAwarePendingMatter[],
): ContextAwarePendingMatter[] {
  const seen = new Set<string>()
  const out: ContextAwarePendingMatter[] = []
  for (const matter of matters) {
    const label = matter.label.trim()
    if (!label) continue
    const key = `${matter.id}:${label}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ id: matter.id, label })
  }
  return out
}

export function pendingMatter(id: string, label: string): ContextAwarePendingMatter {
  return { id, label }
}
