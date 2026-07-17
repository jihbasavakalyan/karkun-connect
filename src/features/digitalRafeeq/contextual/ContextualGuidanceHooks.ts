/**
 * Contextual guidance hooks (KC-006 Sprint 6.4).
 *
 * Consumes DigitalRafeeqService only — never calls runtime modules directly.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getDigitalRafeeqService,
  type ConversationRole,
  type DigitalRafeeqResponse,
} from '@/runtime/service'
import {
  buildComplianceGuidanceView,
  buildExecutionGuidanceView,
  buildMeetingGuidanceView,
  buildReportGuidanceView,
  resolveContextualRequest,
  type ComplianceGuidanceView,
  type ContextualSurface,
  type ExecutionGuidanceView,
  type MeetingGuidanceView,
  type ReportGuidanceView,
} from './ContextualPresentation'

type AsyncState<T> = {
  loading: boolean
  view: T
}

function useContextualResponse(
  surface: ContextualSurface,
  route: string,
  role: ConversationRole,
  payload?: Readonly<Record<string, unknown>>,
): {
  enabled: boolean
  loading: boolean
  response: DigitalRafeeqResponse | null
} {
  const { user } = useAuth()
  const enabled = getDigitalRafeeqService().isEnabled()
  const [asyncState, setAsyncState] = useState<{
    loading: boolean
    response: DigitalRafeeqResponse | null
  }>({ loading: false, response: null })

  const payloadKey = JSON.stringify(payload ?? null)

  useEffect(() => {
    if (!enabled || !user?.uid) {
      return
    }

    let cancelled = false
    const service = getDigitalRafeeqService()
    const request = resolveContextualRequest(surface, role, route, payload)

    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      setAsyncState((previous) => ({ ...previous, loading: true }))

      try {
        await service.initialize()
        if (cancelled) return

        if (!service.isReady()) {
          setAsyncState({ loading: false, response: null })
          return
        }

        const response = service.processRequest({
          identity: {
            userId: user.uid,
            displayName: user.displayName ?? undefined,
            role: request.role,
          },
          route: request.route,
          intent: request.intent,
          channel: 'dashboard',
          locale: 'en',
          payload: request.payload,
        })

        if (cancelled) return
        setAsyncState({ loading: false, response })
      } catch {
        if (cancelled) return
        setAsyncState({ loading: false, response: null })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, user?.uid, user?.displayName, surface, route, role, payload, payloadKey])

  if (!enabled) {
    return { enabled: false, loading: false, response: null }
  }

  return {
    enabled: true,
    loading: asyncState.loading,
    response: asyncState.response,
  }
}

export function useExecutionGuidance(options: {
  route: string
  role: ConversationRole
  payload?: Readonly<Record<string, unknown>>
}): {
  enabled: boolean
  loading: boolean
  viewModel: ExecutionGuidanceView
} {
  const { enabled, loading, response } = useContextualResponse(
    'connect_execution',
    options.route,
    options.role,
    options.payload,
  )
  return {
    enabled,
    loading,
    viewModel: buildExecutionGuidanceView(response, enabled),
  }
}

export function useMeetingGuidance(options: {
  route: string
  role: ConversationRole
  payload?: Readonly<Record<string, unknown>>
}): {
  enabled: boolean
  loading: boolean
  viewModel: MeetingGuidanceView
} {
  const { enabled, loading, response } = useContextualResponse(
    'meeting_preparation',
    options.route,
    options.role,
    options.payload,
  )
  return {
    enabled,
    loading,
    viewModel: buildMeetingGuidanceView(response, enabled),
  }
}

export function useComplianceGuidance(options: {
  route: string
  role?: ConversationRole
}): {
  enabled: boolean
  loading: boolean
  viewModel: ComplianceGuidanceView
} {
  const { enabled, loading, response } = useContextualResponse(
    'compliance_review',
    options.route,
    options.role ?? 'administrator',
  )
  return {
    enabled,
    loading,
    viewModel: buildComplianceGuidanceView(response, enabled),
  }
}

export function useReportGuidance(options: {
  route: string
  role: ConversationRole
}): {
  enabled: boolean
  loading: boolean
  viewModel: ReportGuidanceView
} {
  const { enabled, loading, response } = useContextualResponse(
    'report_review',
    options.route,
    options.role,
  )
  return {
    enabled,
    loading,
    viewModel: buildReportGuidanceView(response, enabled),
  }
}

export type { AsyncState }
