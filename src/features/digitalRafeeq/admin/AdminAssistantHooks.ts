/**
 * Administrator Dashboard Assistant hooks (KC-006 Sprint 6.2).
 *
 * Consumes DigitalRafeeqService only — never calls runtime modules directly.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getDigitalRafeeqService,
  type DigitalRafeeqResponse,
} from '@/runtime/service'
import { buildAdminAssistantViewModel } from './adminAssistantPresentation'
import {
  EMPTY_ADMIN_ASSISTANT_VIEW,
  type AdminAssistantViewModel,
} from './AdminAssistantTypes'

export type UseAdminAssistantResult = {
  enabled: boolean
  loading: boolean
  viewModel: AdminAssistantViewModel
}

type AsyncAssistantState = {
  loading: boolean
  viewModel: AdminAssistantViewModel
}

const INITIAL_ASYNC_STATE: AsyncAssistantState = {
  loading: false,
  viewModel: EMPTY_ADMIN_ASSISTANT_VIEW,
}

/**
 * Load Administrator dashboard assistant content when the feature flag is on.
 * When disabled or unavailable, returns a hidden view model (panel should not render).
 */
export function useAdminAssistant(): UseAdminAssistantResult {
  const { user } = useAuth()
  const enabled = getDigitalRafeeqService().isEnabled()
  const [asyncState, setAsyncState] =
    useState<AsyncAssistantState>(INITIAL_ASYNC_STATE)

  useEffect(() => {
    if (!enabled || !user?.uid) {
      return
    }

    let cancelled = false
    const service = getDigitalRafeeqService()

    void (async () => {
      await Promise.resolve()
      if (cancelled) return

      setAsyncState((previous) => ({ ...previous, loading: true }))

      try {
        await service.initialize()
        if (cancelled) return

        if (!service.isReady()) {
          setAsyncState({
            loading: false,
            viewModel: {
              visibility: 'hidden',
              healthLabel: 'Unavailable',
              primaryPriority: null,
              recommendations: [],
              campaignSummary: null,
              outstandingActions: [],
            },
          })
          return
        }

        const response: DigitalRafeeqResponse = service.processRequest({
          identity: {
            userId: user.uid,
            displayName: user.displayName ?? undefined,
            role: 'administrator',
          },
          route: '/admin',
          intent: 'dashboard_overview',
          channel: 'dashboard',
          locale: 'ur',
        })

        if (cancelled) return
        setAsyncState({
          loading: false,
          viewModel: buildAdminAssistantViewModel(response, { enabled: true }),
        })
      } catch {
        if (cancelled) return
        setAsyncState({
          loading: false,
          viewModel: {
            visibility: 'hidden',
            healthLabel: 'Unavailable',
            primaryPriority: null,
            recommendations: [],
            campaignSummary: null,
            outstandingActions: [],
          },
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, user?.uid, user?.displayName])

  if (!enabled) {
    return {
      enabled: false,
      loading: false,
      viewModel: EMPTY_ADMIN_ASSISTANT_VIEW,
    }
  }

  return {
    enabled: true,
    loading: asyncState.loading,
    viewModel: asyncState.viewModel,
  }
}
