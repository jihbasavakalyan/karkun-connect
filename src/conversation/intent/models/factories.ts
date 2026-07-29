/**
 * Model factories — structural construction only (KC-0131.3).
 */

import type { IntentOrigin, ResolutionState } from '../../domain/enums'
import type { IntentTypeCode } from './IntentTypeCode'
import type {
  CandidateIntent,
  IntentBatch,
  IntentConfidence,
  IntentConflictRecord,
  IntentContext,
  IntentDefinition,
  IntentParameter,
  IntentPipelineInput,
  IntentPriority,
  IntentResolutionResult,
  IntentStatus,
  IntentTarget,
  ResolvedIntent,
} from './IntentModels'
import type {
  IntentConfidenceLevel,
  IntentEngineStatus,
  IntentPriorityLevel,
} from './IntentVocabulary'

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function createIntentConfidence(
  level: IntentConfidenceLevel = 'UNKNOWN',
  score: number | null = null,
): IntentConfidence {
  return { level, score }
}

export function createIntentPriority(
  level: IntentPriorityLevel = 'normal',
): IntentPriority {
  return { level }
}

export function createIntentStatus(
  engine: IntentEngineStatus = 'placeholder',
  resolution: ResolutionState = 'placeholder',
): IntentStatus {
  return { engine, resolution }
}

export function createIntentParameter(
  partial: Pick<IntentParameter, 'name'> &
    Partial<Omit<IntentParameter, 'name'>> & { id?: string },
): IntentParameter {
  return {
    id: partial.id ?? newId('iparam'),
    name: partial.name,
    required: partial.required ?? false,
    value: partial.value ?? null,
    present: partial.present ?? partial.value != null,
  }
}

export function createIntentTarget(
  partial: Pick<IntentTarget, 'kind'> &
    Partial<Omit<IntentTarget, 'kind'>> & { id?: string },
): IntentTarget {
  return {
    id: partial.id ?? newId('itarget'),
    kind: partial.kind,
    referenceId: partial.referenceId ?? null,
    label: partial.label ?? null,
    ambiguous: partial.ambiguous ?? false,
  }
}

export function createIntentContext(
  partial?: Partial<IntentContext>,
): IntentContext {
  return {
    conversationId: partial?.conversationId ?? null,
    sessionId: partial?.sessionId ?? null,
    turnId: partial?.turnId ?? null,
    messageId: partial?.messageId ?? null,
    locale: partial?.locale ?? 'ur',
    rawText: partial?.rawText ?? null,
    domainIntentReferenceId: partial?.domainIntentReferenceId ?? null,
    extensions: partial?.extensions ?? {},
  }
}

export function createIntentDefinition(
  partial: Pick<IntentDefinition, 'code' | 'displayName' | 'description'> &
    Partial<Omit<IntentDefinition, 'code' | 'displayName' | 'description'>> & {
      id?: string
    },
): IntentDefinition {
  return {
    id: partial.id ?? `idef_${partial.code}`,
    code: partial.code,
    displayName: partial.displayName,
    description: partial.description,
    defaultPriority: partial.defaultPriority ?? 'normal',
    requiresConfirmation: partial.requiresConfirmation ?? true,
    parameterNames: partial.parameterNames ?? [],
    supported: partial.supported ?? true,
    metadata: partial.metadata ?? {},
  }
}

export function createCandidateIntent(
  partial: Pick<CandidateIntent, 'code' | 'context'> &
    Partial<Omit<CandidateIntent, 'code' | 'context'>> & { id?: string },
): CandidateIntent {
  return {
    id: partial.id ?? newId('icand'),
    code: partial.code,
    origin: partial.origin ?? 'placeholder',
    context: partial.context,
    confidence: partial.confidence ?? createIntentConfidence('UNKNOWN'),
    status: partial.status ?? createIntentStatus('candidate', 'unresolved'),
    parameters: partial.parameters ?? [],
    targets: partial.targets ?? [],
    metadata: partial.metadata ?? {},
  }
}

export function createResolvedIntent(
  partial: Pick<ResolvedIntent, 'code' | 'context'> &
    Partial<Omit<ResolvedIntent, 'code' | 'context'>> & { id?: string },
): ResolvedIntent {
  return {
    id: partial.id ?? newId('ires'),
    definitionId: partial.definitionId ?? null,
    code: partial.code,
    origin: (partial.origin ?? 'placeholder') as IntentOrigin,
    context: partial.context,
    priority: partial.priority ?? createIntentPriority('normal'),
    confidence: partial.confidence ?? createIntentConfidence('UNKNOWN'),
    status: partial.status ?? createIntentStatus('placeholder', 'placeholder'),
    parameters: partial.parameters ?? [],
    targets: partial.targets ?? [],
    conflicts: partial.conflicts ?? [],
    metadata: partial.metadata ?? {},
  }
}

export function createIntentConflictRecord(
  partial: Pick<IntentConflictRecord, 'kind' | 'message'> &
    Partial<Omit<IntentConflictRecord, 'kind' | 'message'>>,
): IntentConflictRecord {
  return {
    kind: partial.kind,
    message: partial.message,
    relatedIntentIds: partial.relatedIntentIds ?? [],
    metadata: partial.metadata ?? {},
  }
}

export function createIntentBatch(
  intents: readonly ResolvedIntent[],
  options?: {
    id?: string
    createdAt?: number
    conflicts?: readonly IntentConflictRecord[]
    planningInputReady?: boolean
    metadata?: Readonly<Record<string, unknown>>
  },
): IntentBatch {
  return {
    id: options?.id ?? newId('ibatch'),
    createdAt: options?.createdAt ?? Date.now(),
    intents,
    primaryIntentId: intents[0]?.id ?? null,
    isMultiIntent: intents.length > 1,
    conflicts: options?.conflicts ?? intents.flatMap((i) => i.conflicts),
    planningInputReady: options?.planningInputReady ?? intents.length > 0,
    metadata: options?.metadata ?? {},
  }
}

export function createIntentResolutionResult(
  partial: Pick<IntentResolutionResult, 'batch'> &
    Partial<Omit<IntentResolutionResult, 'batch'>>,
): IntentResolutionResult {
  return {
    success: partial.success ?? true,
    batch: partial.batch,
    candidates: partial.candidates ?? [],
    issues: partial.issues ?? [],
  }
}

export function createIntentPipelineInput(
  partial?: Partial<IntentPipelineInput>,
): IntentPipelineInput {
  return {
    conversationId: partial?.conversationId ?? null,
    sessionId: partial?.sessionId ?? null,
    turnId: partial?.turnId ?? null,
    messageId: partial?.messageId ?? null,
    locale: partial?.locale ?? 'ur',
    text: partial?.text ?? null,
    domainIntentCodes: partial?.domainIntentCodes ?? [],
    extensions: partial?.extensions ?? {},
  }
}

export function resolveIntentTypeCode(code: string): IntentTypeCode {
  const upper = code.trim().toUpperCase().replace(/[\s-]+/g, '_')
  const aliases: Record<string, IntentTypeCode> = {
    VISIT: 'VISIT_UPDATE',
    VISIT_UPDATE: 'VISIT_UPDATE',
    FOLLOWUP: 'FOLLOW_UP',
    FOLLOW_UP: 'FOLLOW_UP',
    IJTEMA: 'IJTEMA_ATTENDANCE',
    IJTEMA_ATTENDANCE: 'IJTEMA_ATTENDANCE',
    BAITUL_MAAL: 'BAITUL_MAAL',
    BM: 'BAITUL_MAAL',
    APP_REGISTRATION: 'APP_REGISTRATION',
    JIH: 'APP_REGISTRATION',
    CALL: 'CALL',
    WHATSAPP: 'WHATSAPP',
    REMINDER: 'REMINDER',
    SEARCH: 'SEARCH',
    NAVIGATION: 'NAVIGATION',
    NAVIGATE: 'NAVIGATION',
    REPORT: 'REPORT',
    UNKNOWN: 'UNKNOWN',
  }
  return aliases[upper] ?? 'UNKNOWN'
}
