/**
 * Placeholder intent resolver + conflict resolver (KC-0131.3).
 * Architecture only — models conflicts without executing actions.
 */

import type { IntentConflictResolver, IntentResolver } from '../contracts'
import {
  createIntentConflictRecord,
  createIntentPriority,
  createIntentStatus,
  createResolvedIntent,
  isIntentTypeCode,
  type CandidateIntent,
  type IntentConflictRecord,
  type IntentDefinition,
  type IntentTypeCode,
  type ResolvedIntent,
} from '../models'

export function createPlaceholderIntentResolver(): IntentResolver {
  return {
    name: 'placeholder-intent-resolver',
    resolve(candidates: readonly CandidateIntent[], definitions: readonly IntentDefinition[]) {
      const byCode = new Map(definitions.map((d) => [d.code, d]))
      return candidates.map((candidate) => {
        const raw = String(candidate.code)
        const code: IntentTypeCode = isIntentTypeCode(raw) ? raw : 'UNKNOWN'
        const definition = byCode.get(code) ?? null
        return createResolvedIntent({
          id: candidate.id,
          definitionId: definition?.id ?? null,
          code: definition?.code ?? 'UNKNOWN',
          origin: candidate.origin,
          context: candidate.context,
          priority: createIntentPriority(definition?.defaultPriority ?? 'normal'),
          confidence: candidate.confidence,
          status: createIntentStatus(
            code === 'UNKNOWN' ? 'unsupported' : 'resolved',
            code === 'UNKNOWN' ? 'out_of_scope' : 'resolved',
          ),
          parameters: candidate.parameters,
          targets: candidate.targets,
          conflicts: [],
          metadata: {
            ...candidate.metadata,
            resolvedBy: 'placeholder-intent-resolver',
          },
        })
      })
    },
  }
}

export function createPlaceholderIntentConflictResolver(): IntentConflictResolver {
  return {
    name: 'placeholder-intent-conflict-resolver',
    resolveConflicts(intents: readonly ResolvedIntent[]) {
      const conflicts: IntentConflictRecord[] = []
      const seen = new Map<string, string>()

      for (const intent of intents) {
        const prior = seen.get(intent.code)
        if (prior) {
          conflicts.push(
            createIntentConflictRecord({
              kind: 'duplicate',
              message: `Duplicate intent type ${intent.code}`,
              relatedIntentIds: [prior, intent.id],
            }),
          )
        } else {
          seen.set(intent.code, intent.id)
        }

        const missing = intent.parameters.filter((p) => p.required && !p.present)
        if (missing.length > 0) {
          conflicts.push(
            createIntentConflictRecord({
              kind: 'missing_parameters',
              message: `Missing parameters on ${intent.code}: ${missing.map((p) => p.name).join(', ')}`,
              relatedIntentIds: [intent.id],
              metadata: { parameters: missing.map((p) => p.name) },
            }),
          )
        }

        const ambiguousPeople = intent.targets.filter(
          (t) => t.kind === 'person' && t.ambiguous,
        )
        if (ambiguousPeople.length > 0) {
          conflicts.push(
            createIntentConflictRecord({
              kind: 'ambiguous_people',
              message: `Ambiguous person target on ${intent.code}`,
              relatedIntentIds: [intent.id],
              metadata: { targetIds: ambiguousPeople.map((t) => t.id) },
            }),
          )
        }

        if (intent.code === 'UNKNOWN' || intent.status.engine === 'unsupported') {
          conflicts.push(
            createIntentConflictRecord({
              kind: 'unsupported_type',
              message: `Unsupported or unknown intent: ${intent.code}`,
              relatedIntentIds: [intent.id],
            }),
          )
        }
      }

      const mutating = new Set(['VISIT_UPDATE', 'FOLLOW_UP', 'CALL', 'WHATSAPP'])
      const presentMutating = intents.filter((i) => mutating.has(i.code))
      if (presentMutating.length > 1) {
        conflicts.push(
          createIntentConflictRecord({
            kind: 'conflicting_actions',
            message: 'Multiple potentially conflicting action intents in one batch',
            relatedIntentIds: presentMutating.map((i) => i.id),
            metadata: { codes: presentMutating.map((i) => i.code) },
          }),
        )
      }

      const withConflicts = intents.map((intent) => ({
        ...intent,
        conflicts: conflicts.filter((c) => c.relatedIntentIds.includes(intent.id)),
      }))

      return { intents: withConflicts, conflicts }
    },
  }
}
