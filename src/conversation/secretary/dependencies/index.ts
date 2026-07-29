/**
 * Dependency analysis — model only (KC-0131.4).
 *
 * Examples encoded as structural rules:
 * - Visit before Follow-up
 * - Person resolution before update (when person target missing/ambiguous)
 * - Confirmation before financial-like change (Baitul Maal)
 */

import type { DependencyAnalyzer } from '../contracts'
import {
  createExecutionDependency,
  type ExecutionDependency,
  type ExecutionStep,
} from '../plans'
import { isMutatingIntent } from '../policies'

export function createPlaceholderDependencyAnalyzer(): DependencyAnalyzer {
  return {
    name: 'placeholder-dependency-analyzer',
    analyze(steps: readonly ExecutionStep[]) {
      const deps: ExecutionDependency[] = []
      const byCode = new Map<string, ExecutionStep[]>()
      for (const step of steps) {
        const list = byCode.get(String(step.intentCode)) ?? []
        list.push(step)
        byCode.set(String(step.intentCode), list)
      }

      const visits = byCode.get('VISIT_UPDATE') ?? []
      const followUps = byCode.get('FOLLOW_UP') ?? []
      for (const visit of visits) {
        for (const followUp of followUps) {
          deps.push(
            createExecutionDependency({
              kind: 'sequence',
              fromStepId: visit.id,
              toStepId: followUp.id,
              reason: 'Visit before Follow-up',
            }),
          )
        }
      }

      for (const step of steps) {
        const needsPerson = isMutatingIntent(String(step.intentCode))
        const ambiguousOrMissing = Boolean(step.metadata.personUnresolved)
        if (needsPerson && ambiguousOrMissing) {
          deps.push(
            createExecutionDependency({
              kind: 'requires_resolution',
              fromStepId: step.id,
              toStepId: step.id,
              reason: 'Person resolution before update',
            }),
          )
        }

        if (String(step.intentCode) === 'BAITUL_MAAL') {
          deps.push(
            createExecutionDependency({
              kind: 'requires_confirmation',
              fromStepId: step.id,
              toStepId: step.id,
              reason: 'Confirmation before financial change',
            }),
          )
        }
      }

      // Soft sequence by order: earlier → later adjacent mutating steps
      const ordered = [...steps].sort((a, b) => a.order - b.order)
      for (let i = 0; i < ordered.length - 1; i += 1) {
        const from = ordered[i]!
        const to = ordered[i + 1]!
        deps.push(
          createExecutionDependency({
            kind: 'soft',
            fromStepId: from.id,
            toStepId: to.id,
            reason: 'Soft sequential order',
          }),
        )
      }

      return deps
    },
  }
}
