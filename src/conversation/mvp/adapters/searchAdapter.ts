/**
 * SEARCH adapter — read-only people discovery via existing peopleStore/search.
 */

import { getAllKarkuns, getAllMuttafiqeen } from '@/lib/peopleStore'
import { matchesKarkunRegistrySearch } from '@/lib/peopleSearch'
import { mobilesMatch, normalizeMobile } from '@/lib/mobileValidation'
import { adminPersonProfilePath } from '@/lib/personProfile/ProfilePresenter'
import type { ExecutionStep } from '../../secretary/plans'
import type { AdapterContext, ExecutionAdapter } from '../../executionAdapters'
import {
  createAdapterError,
  createAdapterMetadata,
  createAdapterResult,
} from '../../executionAdapters'

export const SEARCH_ADAPTER_ID = 'mvp-search-people'

export type MvpSearchHit = {
  readonly personId: string
  readonly name: string
  readonly mobile: string
  readonly profilePath: string
}

export function searchPeopleReadOnly(query: string, limit = 8): MvpSearchHit[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const pool = [...getAllKarkuns(), ...getAllMuttafiqeen()]
  const byId = new Map(pool.map((person) => [person.id, person]))
  const unique = [...byId.values()]

  const mobileNorm = normalizeMobile(trimmed)
  const mobileHits = unique.filter((person) => mobilesMatch(person.mobile, mobileNorm))
  if (mobileHits.length > 0) {
    return mobileHits.slice(0, limit).map((person) => ({
      personId: person.id,
      name: person.name,
      mobile: person.mobile,
      profilePath: adminPersonProfilePath(person.id),
    }))
  }

  return unique
    .filter((person) => matchesKarkunRegistrySearch(person, trimmed))
    .slice(0, limit)
    .map((person) => ({
      personId: person.id,
      name: person.name,
      mobile: person.mobile,
      profilePath: adminPersonProfilePath(person.id),
    }))
}

export function createSearchPeopleAdapter(): ExecutionAdapter {
  return {
    metadata: createAdapterMetadata({
      adapterId: SEARCH_ADAPTER_ID,
      capability: 'SEARCH',
      name: 'MVP Search People Adapter',
      description: 'Read-only people search via peopleStore + peopleSearch',
      priority: 100,
      available: true,
      isPlaceholder: false,
      extensions: { readOnly: true },
    }),
    adapt(step: ExecutionStep, context: AdapterContext) {
      const query =
        typeof context.extensions['searchQuery'] === 'string'
          ? context.extensions['searchQuery']
          : typeof step.metadata['searchQuery'] === 'string'
            ? String(step.metadata['searchQuery'])
            : step.summary

      try {
        const hits = searchPeopleReadOnly(String(query ?? ''), 8)
        return createAdapterResult({
          status: 'success',
          capability: 'SEARCH',
          adapterId: SEARCH_ADAPTER_ID,
          stepId: step.id,
          summary:
            hits.length === 0
              ? `No people found for “${query}”`
              : `Found ${hits.length} result(s) for “${query}”`,
          isPlaceholder: false,
          invokedService: true,
          metadata: {
            readOnly: true,
            wroteData: false,
            query,
            hits,
          },
        })
      } catch (error) {
        return createAdapterResult({
          status: 'error',
          capability: 'SEARCH',
          adapterId: SEARCH_ADAPTER_ID,
          stepId: step.id,
          summary: 'Search unavailable',
          isPlaceholder: false,
          invokedService: false,
          error: createAdapterError({
            code: 'adapter_unavailable',
            message: error instanceof Error ? error.message : 'Search failed',
            capability: 'SEARCH',
            adapterId: SEARCH_ADAPTER_ID,
            stepId: step.id,
          }),
        })
      }
    },
  }
}
