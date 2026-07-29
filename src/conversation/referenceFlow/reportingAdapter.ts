/**
 * Reporting reference adapter (KC-0131.11).
 * Exactly ONE real adapter — binds REPORTING to MetricsService (read-only).
 */

import type { ExecutionStep } from '../secretary/plans'
import type { AdapterContext, ExecutionAdapter } from '../executionAdapters'
import {
  createAdapterError,
  createAdapterMetadata,
  createAdapterResult,
} from '../executionAdapters'
import {
  getCampaignConnectionMetrics,
  type CampaignConnectionMetrics,
} from '@/services/metricsService'

export const REPORTING_REFERENCE_ADAPTER_ID = 'reference-reporting-metrics'

export type ReportingMetricsInvoker = () => CampaignConnectionMetrics

export type ReportingReferenceAdapterOptions = {
  /** Injectable for failure-path tests. Defaults to MetricsService. */
  readonly invokeMetrics?: ReportingMetricsInvoker
}

export function createReportingReferenceAdapter(
  options: ReportingReferenceAdapterOptions = {},
): ExecutionAdapter {
  const invokeMetrics = options.invokeMetrics ?? getCampaignConnectionMetrics

  return {
    metadata: createAdapterMetadata({
      adapterId: REPORTING_REFERENCE_ADAPTER_ID,
      capability: 'REPORTING',
      name: 'Reporting Reference Adapter',
      description:
        'KC-0131.11 read-only bind to MetricsService.getCampaignConnectionMetrics',
      priority: 100,
      available: true,
      isPlaceholder: false,
      extensions: {
        serviceId: 'metricsService',
        operation: 'getCampaignConnectionMetrics',
        readOnly: true,
      },
    }),
    adapt(step: ExecutionStep, _context: AdapterContext) {
      try {
        const metrics = invokeMetrics()
        return createAdapterResult({
          status: 'success',
          capability: 'REPORTING',
          adapterId: REPORTING_REFERENCE_ADAPTER_ID,
          stepId: step.id,
          summary: `Read-only campaign metrics: ${metrics.connected}/${metrics.total} (${metrics.progressPct}%)`,
          isPlaceholder: false,
          invokedService: true,
          metadata: {
            readOnly: true,
            wroteData: false,
            mutatedFirestore: false,
            serviceId: 'metricsService',
            operation: 'getCampaignConnectionMetrics',
            sourceOfTruth: metrics.sourceOfTruth,
            connected: metrics.connected,
            remaining: metrics.remaining,
            total: metrics.total,
            progressPct: metrics.progressPct,
          },
        })
      } catch (error) {
        return createAdapterResult({
          status: 'error',
          capability: 'REPORTING',
          adapterId: REPORTING_REFERENCE_ADAPTER_ID,
          stepId: step.id,
          summary: 'MetricsService unavailable',
          isPlaceholder: false,
          invokedService: false,
          error: createAdapterError({
            code: 'adapter_unavailable',
            message:
              error instanceof Error ? error.message : 'Service unavailable',
            capability: 'REPORTING',
            adapterId: REPORTING_REFERENCE_ADAPTER_ID,
            stepId: step.id,
          }),
          metadata: {
            readOnly: true,
            wroteData: false,
            mutatedFirestore: false,
          },
        })
      }
    },
  }
}
