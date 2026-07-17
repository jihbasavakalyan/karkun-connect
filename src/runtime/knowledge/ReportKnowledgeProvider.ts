/**
 * Live ReportKnowledgeProvider (KC-005 Sprint 2.2).
 */

import type { ReportAdapter } from '@/conversation/adapters'
import type {
  KnowledgeProviderContribution,
  KnowledgeRequest,
  ReportKnowledgeProvider as ReportKnowledgeProviderContract,
} from '@/conversation/knowledge'
import { contributionFromAdapterResults, scopeFromRequest } from './knowledgeProviderHelpers'

export class ReportKnowledgeProvider implements ReportKnowledgeProviderContract {
  readonly providerId = 'report' as const
  readonly supportedDomains = ['reports'] as const
  readonly priority = 80

  private readonly reportAdapter: ReportAdapter

  constructor(reportAdapter: ReportAdapter) {
    this.reportAdapter = reportAdapter
  }

  provide(request: KnowledgeRequest): KnowledgeProviderContribution {
    const scope = scopeFromRequest(request)
    const dashboard = this.reportAdapter.readDashboardSummaries(scope)
    const execution = this.reportAdapter.readExecutionSummaries(scope)
    const progress = this.reportAdapter.readProgressMetrics(scope)

    return contributionFromAdapterResults(
      this.providerId,
      'reports',
      this.priority,
      'adapter:report',
      [dashboard, execution, progress],
      () => ({
        dashboardSummary: dashboard.ok ? dashboard.data : null,
        executionSummary: execution.ok ? execution.data : null,
        progressMetrics: progress.ok ? progress.data : null,
        errors: [dashboard, execution, progress]
          .filter((result) => !result.ok)
          .map((result) => result.error.code),
      }),
    )
  }
}
