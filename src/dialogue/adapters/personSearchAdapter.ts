/**
 * KC-035R1 — Person search adapter for Dialogue Manager.
 * Reuses MVP universalSearch — no duplicated ranking / SoR logic.
 */

import { searchUniversal } from '@/conversation/mvp/universalSearch'
import { ENTITY_TYPE_LABEL_UR } from '@/conversation/mvp/universalSearchTypes'
import { NAVIGATION_URDU } from '@/navigation/responses/navigationUrduCopy'
import type { NavigationRole } from '@/navigation/models/NavigationTypes'

export type PersonSearchAction = {
  readonly id: string
  readonly label: string
  readonly route: string
  readonly entityType?: string
  readonly description?: string
  readonly primaryActionLabel?: string
}

export type PersonSearchResult = {
  readonly ok: boolean
  readonly query: string
  readonly responseUrdu: string
  readonly personId: string | null
  readonly personName: string | null
  readonly actions: readonly PersonSearchAction[]
  readonly hitCount: number
}

export function executePersonSearch(input: {
  readonly query: string
  readonly role: NavigationRole
  readonly preferPersonName?: string | null
}): PersonSearchResult {
  const query = (input.preferPersonName?.trim() || input.query).trim()
  if (!query) {
    return {
      ok: false,
      query: '',
      responseUrdu: 'کس کارکن کی تلاش کرنی ہے؟ نام بتائیے۔',
      personId: null,
      personName: null,
      actions: [],
      hitCount: 0,
    }
  }

  const hits = searchUniversal(query, input.role, 12)
  const personHits = hits.filter(
    (hit) =>
      hit.entityType === 'karkun' ||
      hit.entityType === 'muttafiq' ||
      hit.entityType === 'rukn',
  )
  const ranked = personHits.length > 0 ? personHits : hits

  if (ranked.length === 0) {
    return {
      ok: false,
      query,
      responseUrdu: NAVIGATION_URDU.searchNoResults(query),
      personId: null,
      personName: null,
      actions: [],
      hitCount: 0,
    }
  }

  const first = ranked[0]!
  const actions: PersonSearchAction[] = ranked.slice(0, 8).map((hit) => ({
    id: hit.id,
    label: hit.name,
    route: hit.route,
    entityType: hit.entityType,
    description: hit.description,
    primaryActionLabel: 'کھولیں',
  }))

  const lines = ranked
    .slice(0, 5)
    .map((hit, index) => {
      const typeLabel = ENTITY_TYPE_LABEL_UR[hit.entityType] ?? hit.entityType
      return `${index + 1}. [${typeLabel}] ${hit.name}`
    })
    .join('\n')

  const header =
    ranked.length === 1 && first.name
      ? NAVIGATION_URDU.presentingPerson(first.name)
      : NAVIGATION_URDU.searchResults(ranked.length)

  return {
    ok: true,
    query,
    responseUrdu: `${header}\n${lines}`,
    personId: first.personId ?? null,
    personName: first.name,
    actions,
    hitCount: ranked.length,
  }
}
