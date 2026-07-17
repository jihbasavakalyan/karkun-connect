/**
 * Runtime React context (KC-005 Sprint 2.0).
 *
 * Purpose: Expose bootstrap status and runtime container to future UI without globals.
 * Ownership: RuntimeProvider writes; hooks read.
 * Future extensions: Chat interface and Digital Rafeeq surfaces consume this context.
 */

import { createContext } from 'react'
import type { RuntimeContainer } from '@/conversation/runtime'
import type { RuntimeBootstrapStatus } from './initializeRuntime'

export type RuntimeContextValue = {
  status: RuntimeBootstrapStatus
  runtime: RuntimeContainer | null
  errorMessage?: string
  initializedAt?: number
  /** True when status is Ready or Degraded (runtime object exists). */
  isAvailable: boolean
}

export const RuntimeContext = createContext<RuntimeContextValue | null>(null)

export const DEFAULT_RUNTIME_CONTEXT_VALUE: RuntimeContextValue = {
  status: 'NotInitialized',
  runtime: null,
  isAvailable: false,
}
