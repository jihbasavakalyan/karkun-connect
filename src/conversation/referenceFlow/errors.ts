/**
 * Reference flow error codes (KC-0131.11).
 */

export type ReferenceFlowErrorCode =
  | 'unsupported_capability'
  | 'service_unavailable'
  | 'pipeline_cancelled'
  | 'confirmation_denied'
  | 'adapter_resolution_failure'

export const REFERENCE_FLOW_ERROR_CODES: readonly ReferenceFlowErrorCode[] = [
  'unsupported_capability',
  'service_unavailable',
  'pipeline_cancelled',
  'confirmation_denied',
  'adapter_resolution_failure',
] as const

export type ReferenceFlowError = {
  readonly code: ReferenceFlowErrorCode
  readonly message: string
  readonly stage: string
  readonly metadata: Readonly<Record<string, unknown>>
}

export function createReferenceFlowError(input: {
  readonly code: ReferenceFlowErrorCode
  readonly message: string
  readonly stage: string
  readonly metadata?: Readonly<Record<string, unknown>>
}): ReferenceFlowError {
  return {
    code: input.code,
    message: input.message,
    stage: input.stage,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  }
}
