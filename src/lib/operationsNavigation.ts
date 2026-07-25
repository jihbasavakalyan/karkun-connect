/**
 * KC-0113.1 / KC-0115 — Activities deep workspace tabs
 * (Follow-up / Campaign Execution / Review).
 * Presentation routing only — no workflow or engine changes.
 */

export const OPERATIONS_TABS = [
  { id: 'queue', label: 'Follow-up' },
  { id: 'execute', label: 'Campaign Execution' },
  { id: 'review', label: 'Review' },
] as const

export type OperationsTab = (typeof OPERATIONS_TABS)[number]['id']

/** Query keys preserved when switching Operations tabs. */
export const OPERATIONS_SHARED_PARAM_KEYS = [
  'rukn',
  'campaign',
  'search',
  'q',
  'date',
  'from',
  'to',
] as const

export function resolveOperationsTab(tabParam: string | null): OperationsTab {
  if (tabParam === 'queue' || tabParam === 'execute' || tabParam === 'review') {
    return tabParam
  }
  // Aliases from product language / deep links
  if (tabParam === 'follow-up' || tabParam === 'work-queue') return 'queue'
  if (tabParam === 'execution') return 'execute'
  if (tabParam === 'compliance') return 'review'
  return 'queue'
}

export function pickOperationsSharedParams(
  source: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams()
  for (const key of OPERATIONS_SHARED_PARAM_KEYS) {
    const value = source.get(key)
    if (value) next.set(key, value)
  }
  return next
}
