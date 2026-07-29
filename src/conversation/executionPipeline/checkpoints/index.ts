/**
 * Pipeline checkpoints (KC-0131.9).
 * Placeholder metadata only — no implementations.
 */

import { createPipelineCheckpoint } from '../lifecycle/factories'
import type { PipelineCheckpoint } from '../lifecycle/models'
import type { PipelineStage } from '../stages/vocabulary'
import { PIPELINE_CHECKPOINT_KINDS, type PipelineCheckpointKind } from '../stages/vocabulary'

export type { PipelineCheckpoint, PipelineCheckpointKind }

export const PLACEHOLDER_CHECKPOINT_TEMPLATES: readonly {
  readonly kind: PipelineCheckpointKind
  readonly label: string
}[] = [
  { kind: 'validation', label: 'Validation checkpoint' },
  { kind: 'confirmation', label: 'Confirmation checkpoint' },
  { kind: 'routing', label: 'Routing checkpoint' },
  { kind: 'completion', label: 'Completion checkpoint' },
  { kind: 'audit', label: 'Audit checkpoint' },
]

export function createPlaceholderCheckpoint(
  kind: PipelineCheckpointKind,
  stage: PipelineStage,
  label?: string,
): PipelineCheckpoint {
  const template = PLACEHOLDER_CHECKPOINT_TEMPLATES.find((t) => t.kind === kind)
  return createPipelineCheckpoint({
    kind,
    stage,
    label: label ?? template?.label ?? kind,
  })
}

export function assertCheckpointKindCoverage(): void {
  for (const kind of PIPELINE_CHECKPOINT_KINDS) {
    if (!PLACEHOLDER_CHECKPOINT_TEMPLATES.some((t) => t.kind === kind)) {
      throw new Error(`Missing checkpoint template: ${kind}`)
    }
  }
}
