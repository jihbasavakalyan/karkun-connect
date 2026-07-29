/**
 * Canonical intent definition registry (KC-0131.3).
 * Metadata only — no execution behaviour.
 */

import {
  createIntentDefinition,
  INTENT_TYPE_CODES,
  type IntentDefinition,
  type IntentTypeCode,
} from '../models'

const DEFINITION_SEED: ReadonlyArray<{
  code: IntentTypeCode
  displayName: string
  description: string
  defaultPriority: IntentDefinition['defaultPriority']
  requiresConfirmation: boolean
  parameterNames: readonly string[]
}> = [
  {
    code: 'VISIT_UPDATE',
    displayName: 'Visit Update',
    description: 'Record or prepare a visit / annexure update',
    defaultPriority: 'high',
    requiresConfirmation: true,
    parameterNames: ['personId', 'connectionId', 'outcome'],
  },
  {
    code: 'FOLLOW_UP',
    displayName: 'Follow-up',
    description: 'Schedule or record a follow-up action',
    defaultPriority: 'normal',
    requiresConfirmation: true,
    parameterNames: ['personId', 'when'],
  },
  {
    code: 'IJTEMA_ATTENDANCE',
    displayName: 'Ijtema Attendance',
    description: 'Weekly Ijtema attendance related intent',
    defaultPriority: 'normal',
    requiresConfirmation: true,
    parameterNames: ['personId', 'cycleId'],
  },
  {
    code: 'BAITUL_MAAL',
    displayName: 'Baitul Maal',
    description: 'Monthly Baitul Maal related intent',
    defaultPriority: 'normal',
    requiresConfirmation: true,
    parameterNames: ['personId', 'cycleId'],
  },
  {
    code: 'APP_REGISTRATION',
    displayName: 'App Registration',
    description: 'JIH / app registration related intent',
    defaultPriority: 'normal',
    requiresConfirmation: true,
    parameterNames: ['personId'],
  },
  {
    code: 'CALL',
    displayName: 'Call',
    description: 'Prepare or queue a phone call (human-dialed)',
    defaultPriority: 'high',
    requiresConfirmation: true,
    parameterNames: ['personId', 'phone'],
  },
  {
    code: 'WHATSAPP',
    displayName: 'WhatsApp',
    description: 'Assist WhatsApp-assisted communication',
    defaultPriority: 'normal',
    requiresConfirmation: true,
    parameterNames: ['personId', 'templateId'],
  },
  {
    code: 'REMINDER',
    displayName: 'Reminder',
    description: 'Create or acknowledge a contextual reminder',
    defaultPriority: 'normal',
    requiresConfirmation: true,
    parameterNames: ['when', 'subject'],
  },
  {
    code: 'SEARCH',
    displayName: 'Search',
    description: 'Search people, connections, or campaign content',
    defaultPriority: 'low',
    requiresConfirmation: false,
    parameterNames: ['query'],
  },
  {
    code: 'NAVIGATION',
    displayName: 'Navigation',
    description: 'Navigate to an existing module or route',
    defaultPriority: 'low',
    requiresConfirmation: false,
    parameterNames: ['route'],
  },
  {
    code: 'REPORT',
    displayName: 'Report',
    description: 'Request a grounded report or briefing summary',
    defaultPriority: 'normal',
    requiresConfirmation: false,
    parameterNames: ['reportKind'],
  },
  {
    code: 'UNKNOWN',
    displayName: 'Unknown',
    description: 'Unrecognized or unsupported intent placeholder',
    defaultPriority: 'low',
    requiresConfirmation: false,
    parameterNames: [],
  },
]

export type IntentDefinitionRegistry = {
  readonly definitions: readonly IntentDefinition[]
  getByCode(code: IntentTypeCode | string): IntentDefinition | null
  getAll(): readonly IntentDefinition[]
  isSupported(code: IntentTypeCode | string): boolean
}

export function createIntentDefinitionRegistry(
  overrides: readonly IntentDefinition[] = [],
): IntentDefinitionRegistry {
  const base = DEFINITION_SEED.map((seed) =>
    createIntentDefinition({
      code: seed.code,
      displayName: seed.displayName,
      description: seed.description,
      defaultPriority: seed.defaultPriority,
      requiresConfirmation: seed.requiresConfirmation,
      parameterNames: seed.parameterNames,
      supported: seed.code !== 'UNKNOWN',
      metadata: { kc: '0131.3' },
    }),
  )

  const byCode = new Map<string, IntentDefinition>()
  for (const definition of base) {
    byCode.set(definition.code, definition)
  }
  for (const override of overrides) {
    byCode.set(override.code, override)
  }

  const definitions = INTENT_TYPE_CODES.map(
    (code) => byCode.get(code) ?? createIntentDefinition({
      code,
      displayName: code,
      description: 'Auto-generated definition',
    }),
  )

  return {
    definitions,
    getByCode(code) {
      return byCode.get(String(code).toUpperCase()) ?? byCode.get(String(code)) ?? null
    },
    getAll() {
      return definitions
    },
    isSupported(code) {
      const found = this.getByCode(code)
      return found?.supported === true && found.code !== 'UNKNOWN'
    },
  }
}

export function assertRegistryIntegrity(registry: IntentDefinitionRegistry): string[] {
  const issues: string[] = []
  for (const code of INTENT_TYPE_CODES) {
    const definition = registry.getByCode(code)
    if (!definition) {
      issues.push(`Missing definition for ${code}`)
      continue
    }
    if (definition.code !== code) {
      issues.push(`Code mismatch for ${code}`)
    }
  }
  if (registry.getAll().length !== INTENT_TYPE_CODES.length) {
    issues.push('Registry size does not match INTENT_TYPE_CODES')
  }
  return issues
}
