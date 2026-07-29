/**
 * Step → capability routing (KC-0131.6).
 */

import type { ExecutionStep } from '../../secretary/plans'
import type { AdapterRouter } from '../contracts'
import { mapIntentCodeToCapability } from '../registry/capabilities'
import type { AdapterCapability } from '../registry/vocabulary'
import { isAdapterCapability } from '../registry/vocabulary'

/**
 * Prefer explicit capability in step metadata, else intent code mapping.
 */
export function routeExecutionStep(step: ExecutionStep): AdapterCapability {
  const fromMeta = step.metadata['adapterCapability']
  if (typeof fromMeta === 'string' && isAdapterCapability(fromMeta)) {
    return fromMeta
  }

  const fromOperation = step.operationCode
  if (isAdapterCapability(fromOperation)) {
    return fromOperation
  }

  return mapIntentCodeToCapability(String(step.intentCode))
}

export function createAdapterRouter(): AdapterRouter {
  return {
    mapStep(step) {
      return routeExecutionStep(step)
    },
    mapIntentCode(intentCode) {
      return mapIntentCodeToCapability(intentCode)
    },
  }
}
