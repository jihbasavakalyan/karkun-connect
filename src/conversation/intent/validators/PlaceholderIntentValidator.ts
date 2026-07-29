/**
 * Structural intent validator (KC-0131.3).
 * Checks registry membership and required-parameter presence flags only.
 */

import type { IntentValidator } from '../contracts'
import {
  createIntentStatus,
  isIntentTypeCode,
  type CandidateIntent,
  type IntentDefinition,
} from '../models'

export function createPlaceholderIntentValidator(): IntentValidator {
  return {
    name: 'placeholder-intent-validator',
    validate(candidates, definitions: readonly IntentDefinition[]) {
      const byCode = new Map(definitions.map((d) => [d.code, d]))
      const accepted: CandidateIntent[] = []
      const rejected: CandidateIntent[] = []
      const issues: string[] = []

      for (const candidate of candidates) {
        const code = String(candidate.code)
        if (!isIntentTypeCode(code)) {
          rejected.push({
            ...candidate,
            status: createIntentStatus('unsupported', 'out_of_scope'),
          })
          issues.push(`Unsupported intent code: ${code}`)
          continue
        }

        const definition = byCode.get(code)
        if (!definition) {
          rejected.push({
            ...candidate,
            status: createIntentStatus('unsupported', 'failed'),
          })
          issues.push(`No registry definition for ${code}`)
          continue
        }

        const missingRequired = definition.parameterNames.filter((name) => {
          const parameter = candidate.parameters.find((p) => p.name === name)
          return parameter?.required && !parameter.present
        })

        if (missingRequired.length > 0) {
          // Still accepted as candidate for conflict modeling — marked validated with note.
          accepted.push({
            ...candidate,
            code,
            status: createIntentStatus('validated', 'ambiguous'),
            metadata: {
              ...candidate.metadata,
              missingRequired,
            },
          })
          issues.push(`Missing parameters for ${code}: ${missingRequired.join(', ')}`)
          continue
        }

        accepted.push({
          ...candidate,
          code,
          status: createIntentStatus('validated', candidate.status.resolution),
          metadata: {
            ...candidate.metadata,
            definitionId: definition.id,
          },
        })
      }

      return { accepted, rejected, issues }
    },
  }
}
