/**
 * SEARCH adapter — read-only universal discovery via existing KC services.
 */

import type { ExecutionStep } from '../../secretary/plans'
import type { AdapterContext, ExecutionAdapter } from '../../executionAdapters'
import {
  createAdapterError,
  createAdapterMetadata,
  createAdapterResult,
} from '../../executionAdapters'
import {
  searchPeopleReadOnly,
  searchUniversal,
  type UniversalSearchHit,
} from '../universalSearch'
import type { RafeeqRole } from '../types'

export const SEARCH_ADAPTER_ID = 'mvp-universal-search'

export type MvpSearchHit = {
  readonly personId: string
  readonly name: string
  readonly mobile: string
  readonly profilePath: string
}

export { searchPeopleReadOnly, searchUniversal }
export type { UniversalSearchHit }

export function createSearchPeopleAdapter(): ExecutionAdapter {
  return {
    metadata: createAdapterMetadata({
      adapterId: SEARCH_ADAPTER_ID,
      capability: 'SEARCH',
      name: 'MVP Universal Search Adapter',
      description:
        'Read-only universal search: people, rukns, campaigns, assignments, modules',
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

      const role: RafeeqRole =
        context.role === 'rukn' ? 'rukn' : 'administrator'

      try {
        const hits = searchUniversal(String(query ?? ''), role, 12)
        return createAdapterResult({
          status: 'success',
          capability: 'SEARCH',
          adapterId: SEARCH_ADAPTER_ID,
          stepId: step.id,
          summary:
            hits.length === 0
              ? `No results for “${query}”`
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
