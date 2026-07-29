/**
 * Adapter factories (KC-0131.6).
 */

import type {
  AdapterContext,
  AdapterError,
  AdapterMetadata,
  AdapterResolution,
  AdapterResult,
  CapabilityDefinition,
} from './models'
import type {
  AdapterCapability,
  AdapterErrorCode,
  AdapterResolutionKind,
  AdapterResultStatus,
} from './vocabulary'

let resultSeq = 0

function nextResultId(): string {
  resultSeq += 1
  return `adapter-result-${resultSeq}`
}

export function createAdapterMetadata(
  input: Omit<AdapterMetadata, 'version' | 'extensions'> & {
    readonly extensions?: Readonly<Record<string, unknown>>
  },
): AdapterMetadata {
  return {
    adapterId: input.adapterId,
    capability: input.capability,
    name: input.name,
    version: 'kc-0131.6',
    description: input.description,
    priority: input.priority,
    available: input.available,
    isPlaceholder: input.isPlaceholder,
    extensions: Object.freeze({ ...(input.extensions ?? {}) }),
  }
}

export function createAdapterContext(
  partial: Partial<AdapterContext> = {},
): AdapterContext {
  return {
    locale: partial.locale ?? 'ur',
    role: partial.role ?? null,
    ruknId: partial.ruknId ?? null,
    conversationId: partial.conversationId ?? null,
    sessionId: partial.sessionId ?? null,
    planId: partial.planId ?? null,
    stepId: partial.stepId ?? null,
    extensions: Object.freeze({ ...(partial.extensions ?? {}) }),
  }
}

export function createAdapterError(input: {
  readonly code: AdapterErrorCode
  readonly message: string
  readonly capability?: AdapterCapability | null
  readonly adapterId?: string | null
  readonly stepId?: string | null
  readonly metadata?: Readonly<Record<string, unknown>>
}): AdapterError {
  return {
    code: input.code,
    message: input.message,
    capability: input.capability ?? null,
    adapterId: input.adapterId ?? null,
    stepId: input.stepId ?? null,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  }
}

export function createAdapterResult(input: {
  readonly status: AdapterResultStatus
  readonly capability: AdapterCapability
  readonly adapterId?: string | null
  readonly stepId?: string | null
  readonly summary: string
  readonly error?: AdapterError | null
  readonly metadata?: Readonly<Record<string, unknown>>
  readonly isPlaceholder?: boolean
  readonly invokedService?: boolean
}): AdapterResult {
  return {
    id: nextResultId(),
    status: input.status,
    capability: input.capability,
    adapterId: input.adapterId ?? null,
    stepId: input.stepId ?? null,
    summary: input.summary,
    isPlaceholder: input.isPlaceholder ?? true,
    invokedService: input.invokedService ?? false,
    performedWork: false,
    error: input.error ?? null,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  }
}

export function createAdapterResolution(input: {
  readonly kind: AdapterResolutionKind
  readonly capability: AdapterCapability
  readonly requestedCapability: AdapterCapability
  readonly adapterId?: string | null
  readonly reason: string
  readonly candidates?: readonly string[]
  readonly error?: AdapterError | null
}): AdapterResolution {
  return {
    kind: input.kind,
    capability: input.capability,
    requestedCapability: input.requestedCapability,
    adapterId: input.adapterId ?? null,
    reason: input.reason,
    candidates: Object.freeze([...(input.candidates ?? [])]),
    error: input.error ?? null,
  }
}

export function createCapabilityDefinition(
  input: CapabilityDefinition,
): CapabilityDefinition {
  return {
    capability: input.capability,
    label: input.label,
    description: input.description,
    fallbackCapability: input.fallbackCapability,
    intentCodes: Object.freeze([...input.intentCodes]),
  }
}
