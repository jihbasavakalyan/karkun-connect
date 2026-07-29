/**
 * Intent Engine Foundation — confidence & status vocabulary (KC-0131.3).
 * Confidence levels are declared only — never calculated in this sprint.
 */

export type IntentConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'

export type IntentEngineStatus =
  | 'candidate'
  | 'normalized'
  | 'validated'
  | 'resolved'
  | 'rejected'
  | 'ambiguous'
  | 'unsupported'
  | 'placeholder'

export type IntentConflictKind =
  | 'duplicate'
  | 'missing_parameters'
  | 'ambiguous_people'
  | 'conflicting_actions'
  | 'unsupported_type'

export type IntentPriorityLevel = 'low' | 'normal' | 'high' | 'critical'

export const INTENT_CONFIDENCE_LEVELS: readonly IntentConfidenceLevel[] = [
  'HIGH',
  'MEDIUM',
  'LOW',
  'UNKNOWN',
] as const

export const INTENT_ENGINE_STATUSES: readonly IntentEngineStatus[] = [
  'candidate',
  'normalized',
  'validated',
  'resolved',
  'rejected',
  'ambiguous',
  'unsupported',
  'placeholder',
] as const

export const INTENT_CONFLICT_KINDS: readonly IntentConflictKind[] = [
  'duplicate',
  'missing_parameters',
  'ambiguous_people',
  'conflicting_actions',
  'unsupported_type',
] as const

export const INTENT_PRIORITY_LEVELS: readonly IntentPriorityLevel[] = [
  'low',
  'normal',
  'high',
  'critical',
] as const
