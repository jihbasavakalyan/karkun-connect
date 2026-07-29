/**
 * Execution Adapter core models (KC-0131.6).
 */

import type {
  AdapterCapability,
  AdapterErrorCode,
  AdapterResolutionKind,
  AdapterResultStatus,
} from './vocabulary'

export type AdapterId = string
export type AdapterResultId = string

export type AdapterMetadata = {
  readonly adapterId: AdapterId
  readonly capability: AdapterCapability
  readonly name: string
  readonly version: 'kc-0131.6'
  readonly description: string
  readonly priority: number
  readonly available: boolean
  /** False only for the KC-0131.11 reference adapter (read-only service bind). */
  readonly isPlaceholder: boolean
  readonly extensions: Readonly<Record<string, unknown>>
}

export type AdapterContext = {
  readonly locale: 'ur' | 'en'
  readonly role: 'administrator' | 'rukn' | null
  readonly ruknId: string | null
  readonly conversationId: string | null
  readonly sessionId: string | null
  readonly planId: string | null
  readonly stepId: string | null
  readonly extensions: Readonly<Record<string, unknown>>
}

export type AdapterError = {
  readonly code: AdapterErrorCode
  readonly message: string
  readonly capability: AdapterCapability | null
  readonly adapterId: AdapterId | null
  readonly stepId: string | null
  readonly metadata: Readonly<Record<string, unknown>>
}

export type AdapterResult = {
  readonly id: AdapterResultId
  readonly status: AdapterResultStatus
  readonly capability: AdapterCapability
  readonly adapterId: AdapterId | null
  readonly stepId: string | null
  readonly summary: string
  readonly isPlaceholder: boolean
  readonly invokedService: boolean
  /** Architecture invariant for KC-0131.11: reference flow is read-only (no writes). */
  readonly performedWork: false
  readonly error: AdapterError | null
  readonly metadata: Readonly<Record<string, unknown>>
}

export type CapabilityDefinition = {
  readonly capability: AdapterCapability
  readonly label: string
  readonly description: string
  readonly fallbackCapability: AdapterCapability | null
  readonly intentCodes: readonly string[]
}

export type AdapterResolution = {
  readonly kind: AdapterResolutionKind
  readonly capability: AdapterCapability
  readonly requestedCapability: AdapterCapability
  readonly adapterId: AdapterId | null
  readonly reason: string
  readonly candidates: readonly AdapterId[]
  readonly error: AdapterError | null
}
