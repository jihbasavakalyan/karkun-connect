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
import {
  DEFAULT_RUNTIME_CONTEXT_VALUE,
  RuntimeContext,
  type RuntimeContextValue,
} from './RuntimeContext'
import {
  getRuntimeBootstrapResult,
  initializeRuntime,
  type RuntimeBootstrapStatus,
} from './initializeRuntime'
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
  const current = getRuntimeBootstrapResult()
  if (current.status === 'NotInitialized') {
    return toContextValue('Initializing', null)
  }
  return toContextValue(
    current.status,
    current.runtime,
    current.errorMessage,
    current.initializedAt,
  )
}

export function RuntimeProvider({ children }: RuntimeProviderProps) {
  const [value, setValue] = useState<RuntimeContextValue>(readInitialContextValue)

  useEffect(() => {
    let cancelled = false

    void initializeRuntime()
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
  }, [])

  const contextValue = useMemo(() => value, [value])

  return (
    <RuntimeContext.Provider value={contextValue ?? DEFAULT_RUNTIME_CONTEXT_VALUE}>
      {children}
    </RuntimeContext.Provider>
  )
}
