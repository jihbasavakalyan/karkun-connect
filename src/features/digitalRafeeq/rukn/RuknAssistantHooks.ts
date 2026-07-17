/**
 * Rukn Home Assistant hooks (KC-006 Sprint 6.3).
 *
 * Consumes DigitalRafeeqService only — never calls runtime modules directly.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getDigitalRafeeqService,
  type DigitalRafeeqResponse,
} from '@/runtime/service'
import { buildRuknAssistantViewModel } from './ruknAssistantPresentation'
import {
  EMPTY_RUKN_ASSISTANT_VIEW,
  type RuknAssistantViewModel,
} from './RuknAssistantTypes'

export type UseRuknAssistantResult = {
  enabled: boolean
  loading: boolean
  viewModel: RuknAssistantViewModel
}

type AsyncAssistantState = {
  loading: boolean
  viewModel: RuknAssistantViewModel
}

const INITIAL_ASYNC_STATE: AsyncAssistantState = {
  loading: false,
  viewModel: EMPTY_RUKN_ASSISTANT_VIEW,
}

/**
 * Load Rukn Home assistant content when the feature flag is on.
 * When disabled or unavailable, returns a hidden view model (panel should not render).
 */
export function useRuknAssistant(): UseRuknAssistantResult {
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
            viewModel: EMPTY_RUKN_ASSISTANT_VIEW,
          })
          return
        }

        const response: DigitalRafeeqResponse = service.processRequest({
          identity: {
            userId: user.uid,
            displayName: user.displayName ?? undefined,
            role: 'rukn',
          },
          route: '/home',
          intent: 'daily_execution',
          channel: 'dashboard',
          locale: 'en',
        })

        if (cancelled) return
        setAsyncState({
          loading: false,
          viewModel: buildRuknAssistantViewModel(response, { enabled: true }),
        })
      } catch {
        if (cancelled) return
        setAsyncState({
          loading: false,
          viewModel: EMPTY_RUKN_ASSISTANT_VIEW,
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
      viewModel: EMPTY_RUKN_ASSISTANT_VIEW,
    }
  }

  return {
    enabled: true,
    loading: asyncState.loading,
    viewModel: asyncState.viewModel,
  }
}
