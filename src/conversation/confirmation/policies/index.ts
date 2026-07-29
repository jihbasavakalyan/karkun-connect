/**
 * Placeholder confirmation policies (KC-0131.8).
 * Metadata definitions only — no evaluation logic.
 */

import { createConfirmationPolicy } from '../decisions'
import type { ConfirmationPolicy } from '../decisions/models'
import type { ConfirmationPolicyKind } from '../decisions/vocabulary'
import { CONFIRMATION_POLICY_KINDS } from '../decisions/vocabulary'

export const PLACEHOLDER_CONFIRMATION_POLICIES: readonly ConfirmationPolicy[] = [
  createConfirmationPolicy({
    kind: 'read_only_action',
    label: 'Read-only action',
    description: 'Non-mutating read — typically auto-approvable in future rules',
    defaultDecisionHint: 'AUTO_APPROVED',
  }),
  createConfirmationPolicy({
    kind: 'informational_response',
    label: 'Informational response',
    description: 'Informational only — no business mutation',
    defaultDecisionHint: 'AUTO_APPROVED',
  }),
  createConfirmationPolicy({
    kind: 'single_business_action',
    label: 'Single business action',
    description: 'One mutating platform action',
    defaultDecisionHint: 'USER_CONFIRMATION_REQUIRED',
  }),
  createConfirmationPolicy({
    kind: 'multiple_business_actions',
    label: 'Multiple business actions',
    description: 'Grouped mutating actions',
    defaultDecisionHint: 'USER_CONFIRMATION_REQUIRED',
  }),
  createConfirmationPolicy({
    kind: 'external_communication',
    label: 'External communication',
    description: 'Outbound communication (call / WhatsApp / message)',
    defaultDecisionHint: 'USER_CONFIRMATION_REQUIRED',
  }),
  createConfirmationPolicy({
    kind: 'high_impact_operation',
    label: 'High-impact operation',
    description: 'High risk / irreversible operation',
    defaultDecisionHint: 'USER_CONFIRMATION_REQUIRED',
  }),
]

const BY_KIND = new Map(PLACEHOLDER_CONFIRMATION_POLICIES.map((p) => [p.kind, p]))

export function listConfirmationPolicies(): readonly ConfirmationPolicy[] {
  return PLACEHOLDER_CONFIRMATION_POLICIES
}

export function getConfirmationPolicy(
  kind: ConfirmationPolicyKind,
): ConfirmationPolicy | null {
  return BY_KIND.get(kind) ?? null
}

export function assertConfirmationPolicyCoverage(): void {
  for (const kind of CONFIRMATION_POLICY_KINDS) {
    if (!BY_KIND.has(kind)) {
      throw new Error(`Missing confirmation policy metadata: ${kind}`)
    }
  }
}
