/**
 * Secretary planner — planning pipeline orchestration (KC-0131.4).
 *
 * Resolved Intent Batch
 *   → Planning Context
 *   → Policy Evaluation
 *   → Dependency Analysis
 *   → Sequencing
 *   → Confirmation Analysis
 *   → Execution Plan
 *   → Planning Result
 *
 * Never executes.
 */

import type { IntentBatch, ResolvedIntent } from '../../intent/models'
import type {
  ConfirmationAnalyzer,
  DependencyAnalyzer,
  OrderingPolicy,
  PlanningPolicy,
  RolePolicy,
  SafetyPolicy,
  SecretaryPlanner,
  StepSequencer,
} from '../contracts'
import { createPlaceholderConfirmationAnalyzer } from '../confirmation'
import { createPlaceholderDependencyAnalyzer } from '../dependencies'
import {
  createExecutionGroup,
  createExecutionPlan,
  createExecutionStep,
  createPlanningIssue,
  createPlanningMetadata,
  createPlanningResult,
  createPlanningWarning,
  createConfirmationRequirement,
  type ExecutionStep,
  type PlanningContext,
  type PlanningIssue,
  type PlanningWarning,
} from '../plans'
import {
  createPlaceholderOrderingPolicy,
  createPlaceholderPlanningPolicy,
  createPlaceholderRolePolicy,
  createPlaceholderSafetyPolicy,
} from '../policies'
import { createPlaceholderStepSequencer } from '../sequencing'

export type SecretaryPlannerDependencies = {
  readonly planningPolicy?: PlanningPolicy
  readonly orderingPolicy?: OrderingPolicy
  readonly safetyPolicy?: SafetyPolicy
  readonly rolePolicy?: RolePolicy
  readonly sequencer?: StepSequencer
  readonly dependencyAnalyzer?: DependencyAnalyzer
  readonly confirmationAnalyzer?: ConfirmationAnalyzer
}

function intentToDraftStep(intent: ResolvedIntent, order: number): ExecutionStep {
  const missingRequired = intent.parameters.some((p) => p.required && !p.present)
  const ambiguousPerson = intent.targets.some((t) => t.kind === 'person' && t.ambiguous)
  const personUnresolved = missingRequired || ambiguousPerson
  const unsupported = intent.code === 'UNKNOWN' || intent.status.engine === 'unsupported'

  let status: ExecutionStep['status'] = 'planned'
  if (unsupported) status = 'blocked'
  else if (personUnresolved) status = 'incomplete'

  const stepId = `sstep_${intent.id}`
  return createExecutionStep({
    id: stepId,
    order,
    intentId: intent.id,
    intentCode: intent.code,
    operationCode: `secretary:${intent.code}`,
    summary: `Plan ${intent.code} — no execution`,
    status,
    confirmation: createConfirmationRequirement({
      kind: 'incomplete',
      reason: 'Pending confirmation analysis',
      stepId,
      prompt: null,
    }),
    metadata: {
      personUnresolved,
      conflictCount: intent.conflicts.length,
      confidence: intent.confidence.level,
    },
  })
}

export function createSecretaryPlanner(
  deps: SecretaryPlannerDependencies = {},
): SecretaryPlanner {
  const planningPolicy = deps.planningPolicy ?? createPlaceholderPlanningPolicy()
  const orderingPolicy = deps.orderingPolicy ?? createPlaceholderOrderingPolicy()
  const safetyPolicy = deps.safetyPolicy ?? createPlaceholderSafetyPolicy()
  const rolePolicy = deps.rolePolicy ?? createPlaceholderRolePolicy()
  const sequencer = deps.sequencer ?? createPlaceholderStepSequencer(orderingPolicy)
  const dependencyAnalyzer =
    deps.dependencyAnalyzer ?? createPlaceholderDependencyAnalyzer()
  const confirmationAnalyzer =
    deps.confirmationAnalyzer ?? createPlaceholderConfirmationAnalyzer()

  return {
    name: 'secretary-foundation-planner',
    plan(batch: IntentBatch, context: PlanningContext) {
      const issues: PlanningIssue[] = []
      const warnings: PlanningWarning[] = []
      const unresolvedIntentIds: string[] = []

      if (batch.intents.length === 0) {
        issues.push(
          createPlanningIssue({
            code: 'empty_batch',
            severity: 'warning',
            message: 'Intent batch is empty',
          }),
        )
      }

      for (const conflict of batch.conflicts) {
        warnings.push(
          createPlanningWarning({
            code: 'conflict_inherited',
            message: conflict.message,
            metadata: { kind: conflict.kind, related: conflict.relatedIntentIds },
          }),
        )
        issues.push(
          createPlanningIssue({
            code: 'conflict_inherited',
            severity: 'warning',
            message: conflict.message,
            intentId: conflict.relatedIntentIds[0] ?? null,
            metadata: { kind: conflict.kind },
          }),
        )
      }

      let drafts = batch.intents.map((intent, index) => intentToDraftStep(intent, index))

      // Policy + role evaluation
      drafts = drafts.map((step) => {
        if (!rolePolicy.allows(String(step.intentCode), context)) {
          issues.push(
            createPlanningIssue({
              code: 'policy_blocked',
              severity: 'error',
              message: `Role policy blocked ${step.intentCode}`,
              stepId: step.id,
              intentId: step.intentId,
            }),
          )
          unresolvedIntentIds.push(step.intentId ?? step.id)
          return { ...step, status: 'blocked' as const }
        }
        const evaluation = planningPolicy.evaluate(step, context)
        if (!evaluation.allowed) {
          issues.push(
            createPlanningIssue({
              code: step.intentCode === 'UNKNOWN' ? 'unsupported_intent' : 'policy_blocked',
              severity: 'error',
              message: evaluation.reason ?? 'Blocked by planning policy',
              stepId: step.id,
              intentId: step.intentId,
            }),
          )
          unresolvedIntentIds.push(step.intentId ?? step.id)
          return { ...step, status: 'blocked' as const }
        }
        if (step.status === 'incomplete') {
          issues.push(
            createPlanningIssue({
              code: 'missing_parameter',
              severity: 'warning',
              message: `Incomplete planning inputs for ${step.intentCode}`,
              stepId: step.id,
              intentId: step.intentId,
            }),
          )
        }
        return step
      })

      const safety = safetyPolicy.review(drafts, context)
      drafts = drafts.map((step) => {
        if (safety.blockedStepIds.includes(step.id)) {
          issues.push(
            createPlanningIssue({
              code: 'policy_blocked',
              severity: 'error',
              message: safety.reasons[step.id] ?? 'Blocked by safety policy',
              stepId: step.id,
              intentId: step.intentId,
            }),
          )
          unresolvedIntentIds.push(step.intentId ?? step.id)
          return { ...step, status: 'blocked' as const }
        }
        return step
      })

      // Sequencing
      let sequenced = sequencer.sequence(drafts)

      // Confirmation analysis
      sequenced = confirmationAnalyzer.analyze(sequenced, context)

      // Dependencies (after order stabilized)
      const dependencies = dependencyAnalyzer.analyze(sequenced)
      for (const dep of dependencies) {
        if (dep.kind === 'requires_resolution') {
          issues.push(
            createPlanningIssue({
              code: 'unresolved_dependency',
              severity: 'warning',
              message: dep.reason,
              stepId: dep.toStepId,
            }),
          )
        }
      }

      // Groups: read-only vs mutating vs blocked
      const readyIds = sequenced.filter((s) => s.status === 'ready').map((s) => s.id)
      const confirmIds = sequenced
        .filter((s) => s.status === 'awaiting_confirmation')
        .map((s) => s.id)
      const blockedIds = sequenced
        .filter((s) => s.status === 'blocked' || s.status === 'incomplete')
        .map((s) => s.id)

      const groups = [
        createExecutionGroup({ label: 'Ready', stepIds: readyIds, order: 0 }),
        createExecutionGroup({
          label: 'Awaiting Confirmation',
          stepIds: confirmIds,
          order: 1,
        }),
        createExecutionGroup({ label: 'Blocked / Incomplete', stepIds: blockedIds, order: 2 }),
      ].filter((g) => g.stepIds.length > 0)

      const plan = createExecutionPlan({
        summary: `Secretary plan for ${sequenced.length} step(s) — no execution`,
        steps: sequenced,
        groups,
        dependencies,
        metadata: createPlanningMetadata({
          ...context,
          intentBatchId: context.intentBatchId ?? batch.id,
        }),
      })

      const success =
        sequenced.length > 0 &&
        sequenced.some((s) => s.status === 'ready' || s.status === 'awaiting_confirmation')

      return createPlanningResult({
        success,
        plan,
        issues,
        warnings,
        unresolvedIntentIds: [...new Set(unresolvedIntentIds)],
      })
    },
  }
}
