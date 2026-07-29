/**
 * Placeholder adapter results (KC-0131.6).
 */

import type { ExecutionStep } from '../../secretary/plans'
import {
  createAdapterError,
  createAdapterResult,
} from '../registry/factories'
import type { AdapterResolution, AdapterResult } from '../registry/models'
import type { AdapterCapability } from '../registry/vocabulary'

export function createPlaceholderAdapterResult(input: {
  readonly step: ExecutionStep
  readonly capability: AdapterCapability
  readonly resolution: AdapterResolution
}): AdapterResult {
  const { step, capability, resolution } = input

  if (resolution.kind === 'exact' || resolution.kind === 'fallback') {
    return createAdapterResult({
      status: 'placeholder',
      capability: resolution.capability,
      adapterId: resolution.adapterId,
      stepId: step.id,
      summary: `Placeholder route for ${step.intentCode} via ${resolution.capability}`,
      metadata: {
        resolutionKind: resolution.kind,
        requestedCapability: capability,
        reason: resolution.reason,
      },
    })
  }

  if (resolution.kind === 'unsupported') {
    return createAdapterResult({
      status: 'unsupported',
      capability,
      stepId: step.id,
      summary: `Unsupported capability for step ${step.id}`,
      error:
        resolution.error ??
        createAdapterError({
          code: 'capability_unsupported',
          message: 'Capability unsupported',
          capability,
          stepId: step.id,
        }),
      metadata: { resolutionKind: resolution.kind },
    })
  }

  const code =
    resolution.kind === 'conflict' ? 'configuration_error' : 'adapter_unavailable'

  return createAdapterResult({
    status: 'error',
    capability: resolution.capability,
    adapterId: resolution.adapterId,
    stepId: step.id,
    summary: resolution.reason,
    error:
      resolution.error ??
      createAdapterError({
        code,
        message: resolution.reason,
        capability: resolution.capability,
        adapterId: resolution.adapterId,
        stepId: step.id,
      }),
    metadata: {
      resolutionKind: resolution.kind,
      candidates: resolution.candidates,
    },
  })
}
