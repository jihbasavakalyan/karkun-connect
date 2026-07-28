/**
 * KC-0127 — Registry deep-link helpers (URL ↔ PeopleFilters).
 * Presentation / navigation only — filter values and matching logic unchanged.
 */

import { ROUTES } from '@/constants/routes'
import type { PeopleFilters } from '@/types/people.types'

const FILTER_KEYS: Array<keyof PeopleFilters> = [
  'search',
  'gender',
  'status',
  'assignmentStatus',
  'registryLifecycle',
  'jihPortalRegistration',
  'jihPortalReporting',
  'baitulMaalStatus',
  'baitulMaalMonth',
  'baitulMaalYear',
  'ijtemaAttendanceStatus',
  'ijtemaWeek',
]

export type RegistryDeepLinkOptions = Partial<PeopleFilters> & {
  action?: 'add'
}

export function adminKarkunRegistryPath(options: RegistryDeepLinkOptions = {}): string {
  const params = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    const value = options[key]
    if (value != null && String(value).trim() !== '') {
      params.set(key, String(value))
    }
  }
  if (options.action === 'add') {
    params.set('action', 'add')
  }
  const query = params.toString()
  return query ? `${ROUTES.ADMIN_KARKUN}?${query}` : ROUTES.ADMIN_KARKUN
}

export function parsePeopleFiltersFromSearchParams(
  params: URLSearchParams,
): Partial<PeopleFilters> {
  const next: Partial<PeopleFilters> = {}
  for (const key of FILTER_KEYS) {
    const raw = params.get(key)
    if (raw == null || raw === '') continue
    ;(next as Record<string, string>)[key] = raw
  }
  return next
}

export function hasRegistryActionAdd(params: URLSearchParams): boolean {
  return params.get('action') === 'add'
}
