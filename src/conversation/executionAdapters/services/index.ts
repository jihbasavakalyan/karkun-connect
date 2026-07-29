/**
 * Execution Adapter service façade (KC-0131.6).
 */

import type { ExecutionAdapterService } from '../contracts'
import {
  createAdapterContext,
  createAdapterResult,
} from '../registry/factories'
import { createAdapterRegistry } from '../registry'
import { createAdapterResolver } from '../resolution'
import { createPlaceholderAdapterResult } from '../results'
import { createAdapterRouter } from '../routing'
import { createInvalidMappingError } from '../errors'
import { validateExecutionStepMapping } from '../validators'
import { createDefaultPlaceholderAdapters } from './placeholders'

export type ExecutionAdapterServiceOptions = {
  readonly seedPlaceholders?: boolean
}

export function createExecutionAdapterService(
  options: ExecutionAdapterServiceOptions = {},
): ExecutionAdapterService {
  const seedPlaceholders = options.seedPlaceholders !== false
  const placeholders = seedPlaceholders ? createDefaultPlaceholderAdapters() : []
  const registry = createAdapterRegistry(placeholders.map((a) => a.metadata))
  const router = createAdapterRouter()
  const resolver = createAdapterResolver()
  const adaptersById = new Map(
    placeholders.map((a) => [a.metadata.adapterId, a] as const),
  )

  return {
    registry,
    router,
    resolver,
    routeStep(step) {
      return router.mapStep(step)
    },
    resolveCapability(capability) {
      return resolver.resolve(capability, registry)
    },
    adaptStep(step, contextPartial) {
      const validation = validateExecutionStepMapping(step)
      if (!validation.valid) {
        return createAdapterResult({
          status: 'error',
          capability: 'UNKNOWN',
          stepId: step.id,
          summary: 'Invalid step mapping',
          error:
            validation.issues[0] ??
            createInvalidMappingError('Invalid mapping', step.id),
        })
      }

      const capability = router.mapStep(step)
      const resolution = resolver.resolve(capability, registry)
      const context = createAdapterContext({
        ...contextPartial,
        stepId: step.id,
      })

      if (
        (resolution.kind === 'exact' || resolution.kind === 'fallback') &&
        resolution.adapterId
      ) {
        const adapter = adaptersById.get(resolution.adapterId)
        if (adapter) {
          return adapter.adapt(step, context)
        }
      }

      return createPlaceholderAdapterResult({ step, capability, resolution })
    },
    listCapabilities() {
      return registry.listCapabilities()
    },
  }
}

export { createDefaultPlaceholderAdapters, createPlaceholderExecutionAdapter } from './placeholders'
