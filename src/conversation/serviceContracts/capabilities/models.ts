/**
 * Service Integration Contracts core models (KC-0131.7).
 */

import type {
  ServiceAvailabilityState,
  ServiceCapability,
  ServiceDiscoveryStatus,
  ServiceErrorCode,
  ServiceInvocationStatus,
  ServiceTransactionScope,
} from './vocabulary'

export type ServiceId = string
export type ServiceContractId = string
export type ServiceInvocationId = string
export type ServiceResolutionId = string

/**
 * Logical platform service reference — string id only.
 * Never import `src/services/*` from this module.
 */
export type LogicalServiceRef = {
  readonly serviceId: ServiceId
  /** Human label; not a module path import. */
  readonly label: string
  /** Optional documented path for operators (string metadata). */
  readonly documentedModulePath: string | null
}

export type ServiceMetadata = {
  readonly contractVersion: 'kc-0131.7'
  readonly engine: 'service-integration-contracts'
  readonly createdAt: number
  readonly locale: 'ur' | 'en' | null
  readonly extensions: Readonly<Record<string, unknown>>
}

export type ServiceCapabilityDefinition = {
  readonly capability: ServiceCapability
  readonly label: string
  readonly description: string
  readonly logicalServices: readonly LogicalServiceRef[]
  readonly relatedAdapterCapabilities: readonly string[]
}

export type ServiceDescriptor = {
  readonly serviceId: ServiceId
  readonly label: string
  readonly capabilities: readonly ServiceCapability[]
  readonly operations: readonly string[]
  readonly available: boolean
  readonly deprecated: boolean
  readonly documentedModulePath: string | null
  readonly metadata: ServiceMetadata
}

export type ServiceAvailability = {
  readonly serviceId: ServiceId
  readonly state: ServiceAvailabilityState
  readonly reason: string | null
  readonly checkedAt: number | null
  /** Architecture placeholder — no live probe in KC-0131.7. */
  readonly isPlaceholder: true
}

export type ServiceContract = {
  readonly id: ServiceContractId
  readonly serviceId: ServiceId
  readonly capability: ServiceCapability
  readonly operation: string
  readonly inputSchemaHint: string
  readonly outputSchemaHint: string
  readonly transactionScopes: readonly ServiceTransactionScope[]
  readonly metadata: ServiceMetadata
}

export type ServiceError = {
  readonly code: ServiceErrorCode
  readonly message: string
  readonly serviceId: ServiceId | null
  readonly capability: ServiceCapability | null
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ServiceResolution = {
  readonly id: ServiceResolutionId
  readonly status: ServiceDiscoveryStatus
  readonly capability: ServiceCapability
  readonly serviceId: ServiceId | null
  readonly reason: string
  readonly candidates: readonly ServiceId[]
  readonly error: ServiceError | null
}

export type ServiceInvocationRequest = {
  readonly id: ServiceInvocationId
  readonly capability: ServiceCapability
  readonly serviceId: ServiceId | null
  readonly operation: string
  readonly transactionScope: ServiceTransactionScope
  readonly correlationId: string | null
  readonly planId: string | null
  readonly stepId: string | null
  readonly payload: Readonly<Record<string, unknown>>
  readonly metadata: ServiceMetadata
  /** Immutable architecture contract — never mutated after factory. */
  readonly immutable: true
}

export type ServiceInvocationResult = {
  readonly id: ServiceInvocationId
  readonly requestId: ServiceInvocationId
  readonly status: ServiceInvocationStatus
  readonly capability: ServiceCapability
  readonly serviceId: ServiceId | null
  readonly summary: string
  readonly payload: Readonly<Record<string, unknown>>
  readonly error: ServiceError | null
  readonly isPlaceholder: true
  readonly invokedService: false
  readonly performedWork: false
  readonly metadata: ServiceMetadata
  readonly immutable: true
}
