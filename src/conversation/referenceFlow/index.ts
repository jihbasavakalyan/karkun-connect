/**
 * Digital Rafeeq Reference Execution Flow — KC-0131.11 public API.
 *
 * First functional validation: full stack → one read-only MetricsService bind.
 *
 * @see docs/architecture/reference-execution-flow.md
 */

import { createReportingReferenceAdapter } from './reportingAdapter'
import { runReportingReferenceFlow } from './runReferenceFlow'

export * from './errors'
export * from './observability'
export * from './types'
export * from './reportingAdapter'
export * from './runReferenceFlow'

export function createReferenceExecutionFlowFoundation() {
  return {
    runReporting: runReportingReferenceFlow,
    createReportingAdapter: createReportingReferenceAdapter,
  }
}

export type ReferenceExecutionFlowFoundation = ReturnType<
  typeof createReferenceExecutionFlowFoundation
>
