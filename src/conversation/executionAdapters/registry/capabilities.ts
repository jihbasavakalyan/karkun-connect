/**
 * Canonical capability registry definitions (KC-0131.6).
 */

import { createCapabilityDefinition } from './factories'
import type { CapabilityDefinition } from './models'
import type { AdapterCapability } from './vocabulary'
import { ADAPTER_CAPABILITIES } from './vocabulary'

export const CANONICAL_CAPABILITY_DEFINITIONS: readonly CapabilityDefinition[] = [
  createCapabilityDefinition({
    capability: 'VISIT',
    label: 'Visit',
    description: 'Field visit / follow-up routing',
    fallbackCapability: null,
    intentCodes: ['VISIT_UPDATE', 'FOLLOW_UP'],
  }),
  createCapabilityDefinition({
    capability: 'COMMUNICATION',
    label: 'Communication',
    description: 'Generic communication routing',
    fallbackCapability: null,
    intentCodes: [],
  }),
  createCapabilityDefinition({
    capability: 'ATTENDANCE',
    label: 'Attendance',
    description: 'Ijtema / attendance routing',
    fallbackCapability: null,
    intentCodes: ['IJTEMA_ATTENDANCE'],
  }),
  createCapabilityDefinition({
    capability: 'REPORTING',
    label: 'Reporting',
    description: 'Report generation routing',
    fallbackCapability: null,
    intentCodes: ['REPORT'],
  }),
  createCapabilityDefinition({
    capability: 'REMINDER',
    label: 'Reminder',
    description: 'Reminder scheduling routing',
    fallbackCapability: null,
    intentCodes: ['REMINDER'],
  }),
  createCapabilityDefinition({
    capability: 'SEARCH',
    label: 'Search',
    description: 'People / content search routing',
    fallbackCapability: null,
    intentCodes: ['SEARCH'],
  }),
  createCapabilityDefinition({
    capability: 'NAVIGATION',
    label: 'Navigation',
    description: 'In-app navigation routing',
    fallbackCapability: null,
    intentCodes: ['NAVIGATION'],
  }),
  createCapabilityDefinition({
    capability: 'CALL',
    label: 'Call',
    description: 'Phone call routing',
    fallbackCapability: 'COMMUNICATION',
    intentCodes: ['CALL'],
  }),
  createCapabilityDefinition({
    capability: 'WHATSAPP',
    label: 'WhatsApp',
    description: 'WhatsApp message routing',
    fallbackCapability: 'COMMUNICATION',
    intentCodes: ['WHATSAPP'],
  }),
  createCapabilityDefinition({
    capability: 'DOCUMENT',
    label: 'Document',
    description: 'Document / registration / baitul maal routing',
    fallbackCapability: null,
    intentCodes: ['BAITUL_MAAL', 'APP_REGISTRATION'],
  }),
  createCapabilityDefinition({
    capability: 'UNKNOWN',
    label: 'Unknown',
    description: 'Unmapped capability placeholder',
    fallbackCapability: null,
    intentCodes: ['UNKNOWN'],
  }),
]

const BY_CAPABILITY = new Map(
  CANONICAL_CAPABILITY_DEFINITIONS.map((d) => [d.capability, d]),
)

const INTENT_TO_CAPABILITY = new Map<string, AdapterCapability>()
for (const def of CANONICAL_CAPABILITY_DEFINITIONS) {
  for (const code of def.intentCodes) {
    INTENT_TO_CAPABILITY.set(code, def.capability)
  }
}

export function getCapabilityDefinition(
  capability: AdapterCapability,
): CapabilityDefinition | null {
  return BY_CAPABILITY.get(capability) ?? null
}

export function mapIntentCodeToCapability(
  intentCode: string,
): AdapterCapability {
  return INTENT_TO_CAPABILITY.get(intentCode) ?? 'UNKNOWN'
}

export function listCapabilityDefinitions(): readonly CapabilityDefinition[] {
  return CANONICAL_CAPABILITY_DEFINITIONS
}

export function assertCanonicalCapabilityCoverage(): void {
  for (const capability of ADAPTER_CAPABILITIES) {
    if (!BY_CAPABILITY.has(capability)) {
      throw new Error(`Missing capability definition: ${capability}`)
    }
  }
}
