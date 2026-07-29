/**
 * Adapter validators (KC-0131.6).
 */

import type { ExecutionStep } from '../../secretary/plans'
import { createInvalidMappingError } from '../errors'
import type { AdapterError, AdapterMetadata } from '../registry/models'
import { isAdapterCapability } from '../registry/vocabulary'
import type { AdapterRegistry } from '../registry'

export type AdapterValidationResult = {
  readonly valid: boolean
  readonly issues: readonly AdapterError[]
}

export function validateExecutionStepMapping(
  step: ExecutionStep,
): AdapterValidationResult {
  const issues: AdapterError[] = []

  if (!step.id) {
    issues.push(createInvalidMappingError('Step id is required', null))
  }
  if (!step.intentCode && !step.operationCode) {
    issues.push(
      createInvalidMappingError(
        'Step requires intentCode or operationCode',
        step.id,
      ),
    )
  }

  const metaCap = step.metadata['adapterCapability']
  if (metaCap !== undefined && typeof metaCap === 'string' && !isAdapterCapability(metaCap)) {
    issues.push(
      createInvalidMappingError(
        `Invalid adapterCapability metadata: ${metaCap}`,
        step.id,
      ),
    )
  }

  return { valid: issues.length === 0, issues: Object.freeze(issues) }
}

export function validateAdapterMetadata(
  metadata: AdapterMetadata,
  registry: AdapterRegistry,
): AdapterValidationResult {
  const issues: AdapterError[] = []

  if (!metadata.adapterId) {
    issues.push(createInvalidMappingError('adapterId is required'))
  }
  if (!registry.getCapability(metadata.capability)) {
    issues.push(
      createInvalidMappingError(
        `Unknown capability on adapter: ${metadata.capability}`,
      ),
    )
  }
  if (metadata.version !== 'kc-0131.6') {
    issues.push(createInvalidMappingError(`Unexpected adapter version: ${metadata.version}`))
  }
  if (metadata.isPlaceholder !== true) {
    issues.push(createInvalidMappingError('KC-0131.6 adapters must be placeholders'))
  }

  return { valid: issues.length === 0, issues: Object.freeze(issues) }
}
