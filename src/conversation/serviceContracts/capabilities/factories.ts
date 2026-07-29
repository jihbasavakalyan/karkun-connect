/**
 * Service Integration Contracts factories (KC-0131.7).
 */

import type {
  LogicalServiceRef,
  ServiceAvailability,
  ServiceCapabilityDefinition,
  ServiceContract,
  ServiceDescriptor,
  ServiceError,
  ServiceInvocationRequest,
  ServiceInvocationResult,
  ServiceMetadata,
  ServiceResolution,
} from './models'
import type {
  ServiceAvailabilityState,
  ServiceCapability,
  ServiceDiscoveryStatus,
  ServiceErrorCode,
  ServiceInvocationStatus,
  ServiceTransactionScope,
} from './vocabulary'

let seq = 0

function nextId(prefix: string): string {
  seq += 1
  return `${prefix}-${seq}`
}

export function createServiceMetadata(
  partial: Partial<ServiceMetadata> = {},
): ServiceMetadata {
  return {
    contractVersion: 'kc-0131.7',
    engine: 'service-integration-contracts',
    createdAt: partial.createdAt ?? Date.now(),
    locale: partial.locale ?? null,
    extensions: Object.freeze({ ...(partial.extensions ?? {}) }),
  }
}

export function createLogicalServiceRef(input: {
  readonly serviceId: string
  readonly label: string
  readonly documentedModulePath?: string | null
}): LogicalServiceRef {
  return {
    serviceId: input.serviceId,
    label: input.label,
    documentedModulePath: input.documentedModulePath ?? null,
  }
}

export function createServiceCapabilityDefinition(
  input: ServiceCapabilityDefinition,
): ServiceCapabilityDefinition {
  return {
    capability: input.capability,
    label: input.label,
    description: input.description,
    logicalServices: Object.freeze([...input.logicalServices]),
    relatedAdapterCapabilities: Object.freeze([...input.relatedAdapterCapabilities]),
  }
}

export function createServiceDescriptor(input: {
  readonly serviceId: string
  readonly label: string
  readonly capabilities: readonly ServiceCapability[]
  readonly operations?: readonly string[]
  readonly available?: boolean
  readonly deprecated?: boolean
  readonly documentedModulePath?: string | null
  readonly metadata?: Partial<ServiceMetadata>
}): ServiceDescriptor {
  return {
    serviceId: input.serviceId,
    label: input.label,
    capabilities: Object.freeze([...input.capabilities]),
    operations: Object.freeze([...(input.operations ?? ['default'])]),
    available: input.available ?? true,
    deprecated: input.deprecated ?? false,
    documentedModulePath: input.documentedModulePath ?? null,
    metadata: createServiceMetadata(input.metadata),
  }
}

export function createServiceAvailability(input: {
  readonly serviceId: string
  readonly state: ServiceAvailabilityState
  readonly reason?: string | null
  readonly checkedAt?: number | null
}): ServiceAvailability {
  return {
    serviceId: input.serviceId,
    state: input.state,
    reason: input.reason ?? null,
    checkedAt: input.checkedAt ?? null,
    isPlaceholder: true,
  }
}

export function createServiceContract(input: {
  readonly serviceId: string
  readonly capability: ServiceCapability
  readonly operation: string
  readonly inputSchemaHint?: string
  readonly outputSchemaHint?: string
  readonly transactionScopes?: readonly ServiceTransactionScope[]
  readonly metadata?: Partial<ServiceMetadata>
}): ServiceContract {
  return {
    id: nextId('svc-contract'),
    serviceId: input.serviceId,
    capability: input.capability,
    operation: input.operation,
    inputSchemaHint: input.inputSchemaHint ?? 'Record<string, unknown>',
    outputSchemaHint: input.outputSchemaHint ?? 'Record<string, unknown>',
    transactionScopes: Object.freeze([
      ...(input.transactionScopes ?? (['single_action'] as const)),
    ]),
    metadata: createServiceMetadata(input.metadata),
  }
}

export function createServiceError(input: {
  readonly code: ServiceErrorCode
  readonly message: string
  readonly serviceId?: string | null
  readonly capability?: ServiceCapability | null
  readonly metadata?: Readonly<Record<string, unknown>>
}): ServiceError {
  return {
    code: input.code,
    message: input.message,
    serviceId: input.serviceId ?? null,
    capability: input.capability ?? null,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  }
}

export function createServiceResolution(input: {
  readonly status: ServiceDiscoveryStatus
  readonly capability: ServiceCapability
  readonly serviceId?: string | null
  readonly reason: string
  readonly candidates?: readonly string[]
  readonly error?: ServiceError | null
}): ServiceResolution {
  return {
    id: nextId('svc-resolution'),
    status: input.status,
    capability: input.capability,
    serviceId: input.serviceId ?? null,
    reason: input.reason,
    candidates: Object.freeze([...(input.candidates ?? [])]),
    error: input.error ?? null,
  }
}

export function createServiceInvocationRequest(input: {
  readonly capability: ServiceCapability
  readonly operation: string
  readonly transactionScope?: ServiceTransactionScope
  readonly serviceId?: string | null
  readonly correlationId?: string | null
  readonly planId?: string | null
  readonly stepId?: string | null
  readonly payload?: Readonly<Record<string, unknown>>
  readonly metadata?: Partial<ServiceMetadata>
}): ServiceInvocationRequest {
  return Object.freeze({
    id: nextId('svc-invoke'),
    capability: input.capability,
    serviceId: input.serviceId ?? null,
    operation: input.operation,
    transactionScope: input.transactionScope ?? 'single_action',
    correlationId: input.correlationId ?? null,
    planId: input.planId ?? null,
    stepId: input.stepId ?? null,
    payload: Object.freeze({ ...(input.payload ?? {}) }),
    metadata: createServiceMetadata(input.metadata),
    immutable: true as const,
  })
}

export function createServiceInvocationResult(input: {
  readonly requestId: string
  readonly status: ServiceInvocationStatus
  readonly capability: ServiceCapability
  readonly summary: string
  readonly serviceId?: string | null
  readonly payload?: Readonly<Record<string, unknown>>
  readonly error?: ServiceError | null
  readonly metadata?: Partial<ServiceMetadata>
}): ServiceInvocationResult {
  return Object.freeze({
    id: nextId('svc-result'),
    requestId: input.requestId,
    status: input.status,
    capability: input.capability,
    serviceId: input.serviceId ?? null,
    summary: input.summary,
    payload: Object.freeze({ ...(input.payload ?? {}) }),
    error: input.error ?? null,
    isPlaceholder: true as const,
    invokedService: false as const,
    performedWork: false as const,
    metadata: createServiceMetadata(input.metadata),
    immutable: true as const,
  })
}
