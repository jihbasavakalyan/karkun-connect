/**
 * Placeholder execution adapters (KC-0131.6).
 * Route endpoints only — never invoke platform services.
 */

import type { ExecutionStep } from '../../secretary/plans'
import type { ExecutionAdapter } from '../contracts'
import { createAdapterMetadata } from '../registry/factories'
import type { AdapterContext, AdapterMetadata } from '../registry/models'
import type { AdapterCapability } from '../registry/vocabulary'
import { createPlaceholderAdapterResult } from '../results'
import { createAdapterResolution } from '../registry/factories'

export function createPlaceholderExecutionAdapter(
  metadata: AdapterMetadata,
): ExecutionAdapter {
  return {
    metadata,
    adapt(step: ExecutionStep, _context: AdapterContext) {
      return createPlaceholderAdapterResult({
        step,
        capability: metadata.capability,
        resolution: createAdapterResolution({
          kind: 'exact',
          capability: metadata.capability,
          requestedCapability: metadata.capability,
          adapterId: metadata.adapterId,
          reason: `Placeholder adapter ${metadata.adapterId}`,
          candidates: [metadata.adapterId],
        }),
      })
    },
  }
}

export function createDefaultPlaceholderAdapters(): readonly ExecutionAdapter[] {
  const specs: ReadonlyArray<{
    readonly capability: AdapterCapability
    readonly name: string
    readonly priority: number
  }> = [
    { capability: 'VISIT', name: 'Visit Placeholder Adapter', priority: 10 },
    {
      capability: 'COMMUNICATION',
      name: 'Communication Placeholder Adapter',
      priority: 10,
    },
    {
      capability: 'ATTENDANCE',
      name: 'Attendance Placeholder Adapter',
      priority: 10,
    },
    {
      capability: 'REPORTING',
      name: 'Reporting Placeholder Adapter',
      priority: 10,
    },
    { capability: 'REMINDER', name: 'Reminder Placeholder Adapter', priority: 10 },
    { capability: 'SEARCH', name: 'Search Placeholder Adapter', priority: 10 },
    {
      capability: 'NAVIGATION',
      name: 'Navigation Placeholder Adapter',
      priority: 10,
    },
    { capability: 'CALL', name: 'Call Placeholder Adapter', priority: 10 },
    { capability: 'WHATSAPP', name: 'WhatsApp Placeholder Adapter', priority: 10 },
    { capability: 'DOCUMENT', name: 'Document Placeholder Adapter', priority: 10 },
  ]

  return specs.map((spec) =>
    createPlaceholderExecutionAdapter(
      createAdapterMetadata({
        adapterId: `placeholder-${spec.capability.toLowerCase()}`,
        capability: spec.capability,
        name: spec.name,
        description: `Architecture placeholder for ${spec.capability}`,
        priority: spec.priority,
        available: true,
        isPlaceholder: true,
      }),
    ),
  )
}
