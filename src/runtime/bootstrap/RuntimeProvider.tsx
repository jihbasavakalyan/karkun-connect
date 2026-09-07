/**
 * Runtime React provider (KC-005 Sprint 2.0).
 *
 * Purpose: Initialize Digital Rafeeq Runtime once and expose it via context.
 * Ownership: Bootstrap integration only — no business methods.
 * Future extensions: Future chat UI wraps under this provider.
 *
 * Initialization failures never crash the application tree.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  DEFAULT_RUNTIME_CONTEXT_VALUE,
  RuntimeContext,
  type RuntimeContextValue,
} from './RuntimeContext'
import type { RuntimeBootstrapStatus } from './initializeRuntime'
import type { RuntimeContainer } from '@/conversation/runtime'

type RuntimeProviderProps = {
  children: ReactNode
}

function toContextValue(
  status: RuntimeBootstrapStatus,
  runtime: RuntimeContainer | null,
  errorMessage?: string,
  initializedAt?: number,
): RuntimeContextValue {
  return {
    status,
    runtime,
    errorMessage,
    initializedAt,
    isAvailable: runtime !== null && (status === 'Ready' || status === 'Degraded'),
  }
}

function readInitialContextValue(): RuntimeContextValue {
  return toContextValue('Initializing', null)
}

export function RuntimeProvider({ children }: RuntimeProviderProps) {
  const { isAuthenticated } = useAuth()
  const [value, setValue] = useState<RuntimeContextValue>(readInitialContextValue)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    let cancelled = false

    void import('./initializeRuntime')
      .then(({ initializeRuntime }) => initializeRuntime())
      .then((bootstrapResult) => {
        if (cancelled) return
        setValue(
          toContextValue(
            bootstrapResult.status,
            bootstrapResult.runtime,
            bootstrapResult.errorMessage,
            bootstrapResult.initializedAt,
          ),
        )
      })
      .catch(() => {
        if (cancelled) return
        setValue(
          toContextValue('Failed', null, 'Runtime initialization failed unexpectedly'),
        )
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const contextValue = useMemo(() => value, [value])

  return (
    <RuntimeContext.Provider value={contextValue ?? DEFAULT_RUNTIME_CONTEXT_VALUE}>
      {children}
    </RuntimeContext.Provider>
  )
}
