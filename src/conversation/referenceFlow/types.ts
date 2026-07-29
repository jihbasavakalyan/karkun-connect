/**
 * Reference flow result types (KC-0131.11).
 */

import type { AdapterResult } from '../executionAdapters'
import type { ConfirmationResult } from '../confirmation'
import type { PipelineResult } from '../executionPipeline'
import type { ServiceInvocationRequest } from '../serviceContracts'
import type { ReferenceFlowError } from './errors'
import type { ReferenceFlowObservability } from './observability'

export type ReferenceFlowCapability = 'REPORTING'

export type ReferenceCampaignMetricsSnapshot = {
  readonly connected: number
  readonly remaining: number
  readonly total: number
  readonly progressPct: number
  readonly sourceOfTruth: 'MetricsService'
}

export type ReferenceFlowResult = {
  readonly success: boolean
  readonly capability: ReferenceFlowCapability
  readonly readOnly: true
  readonly wroteData: false
  readonly mutatedFirestore: false
  readonly layersVisited: readonly string[]
  readonly confirmation: ConfirmationResult | null
  readonly pipeline: PipelineResult | null
  readonly serviceRequest: ServiceInvocationRequest | null
  readonly adapterResult: AdapterResult | null
  readonly metrics: ReferenceCampaignMetricsSnapshot | null
  readonly error: ReferenceFlowError | null
  readonly observability: ReferenceFlowObservability
}
