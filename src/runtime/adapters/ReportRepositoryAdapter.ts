/**
 * Concrete Report adapter (KC-005 Sprint 2.1).
 *
 * Purpose: Bridge campaign / connection / execution repositories to ReportAdapter.
 * Returns metric summaries only — never repository entities.
 */

import {
  BaseRepositoryAdapter,
  DEFAULT_READ_CAPABILITIES,
  adapterOk,
  mapRepositoryFailureResult,
  type AdapterDashboardMetric,
  type AdapterDashboardSummary,
  type AdapterExecutionSummary,
  type AdapterProgressSummary,
  type AdapterResult,
  type AdapterScope,
  type ReportAdapter,
} from '@/conversation/adapters'
import type {
  CampaignRepository,
  ConnectionRepository,
  ExecutionRepository,
} from '@/repositories/interfaces'
import { resolveAdapterAvailability } from './adapterResult'

type ReportSnapshot = {
  campaignId?: string
  connectedCount: number
  pendingCount: number
  meetingsCompleted: number
  meetingsPending: number
  followUpsDue: number
  metrics: AdapterDashboardMetric[]
  generatedAt: number
}

export class ReportRepositoryAdapter extends BaseRepositoryAdapter implements ReportAdapter {
  readonly adapterId = 'report' as const

  private readonly campaignRepository: CampaignRepository
  private readonly connectionRepository: ConnectionRepository
  private readonly executionRepository: ExecutionRepository

  constructor(
    campaignRepository: CampaignRepository,
    connectionRepository: ConnectionRepository,
    executionRepository: ExecutionRepository,
  ) {
    super()
    this.campaignRepository = campaignRepository
    this.connectionRepository = connectionRepository
    this.executionRepository = executionRepository
    this.setCapabilities({
      ...DEFAULT_READ_CAPABILITIES,
      supportsOffline: true,
      supportsBatch: true,
    })
    this.setAvailability(resolveAdapterAvailability())
  }

  readDashboardSummaries(scope?: AdapterScope): AdapterResult<AdapterDashboardSummary> {
    const snapshot = this.loadSnapshot(scope)
    if (!snapshot.ok) return snapshot

    const { campaignId, metrics, generatedAt } = snapshot.data
    const summary: AdapterDashboardSummary = {
      campaignId,
      metrics,
      generatedAt,
    }
    return adapterOk(summary, resolveAdapterAvailability())
  }

  readExecutionSummaries(scope?: AdapterScope): AdapterResult<AdapterExecutionSummary> {
    const snapshot = this.loadSnapshot(scope)
    if (!snapshot.ok) return snapshot

    const { campaignId, meetingsCompleted, meetingsPending, followUpsDue, metrics } =
      snapshot.data
    const summary: AdapterExecutionSummary = {
      campaignId,
      meetingsCompleted,
      meetingsPending,
      followUpsDue,
      metrics,
    }
    return adapterOk(summary, resolveAdapterAvailability())
  }

  readProgressMetrics(scope?: AdapterScope): AdapterResult<AdapterProgressSummary> {
    const snapshot = this.loadSnapshot(scope)
    if (!snapshot.ok) return snapshot

    const { campaignId, connectedCount, pendingCount, metrics } = snapshot.data
    const total = connectedCount + pendingCount
    const summary: AdapterProgressSummary = {
      campaignId,
      completionRatio: total > 0 ? connectedCount / total : undefined,
      connectedCount,
      pendingCount,
      metrics,
    }
    return adapterOk(summary, resolveAdapterAvailability())
  }

  private loadSnapshot(scope?: AdapterScope): AdapterResult<ReportSnapshot> {
    const availability = resolveAdapterAvailability()
    if (availability === 'offline') {
      return mapRepositoryFailureResult(this.adapterId, 'Offline', 'Repository is offline.', 'offline')
    }

    const campaignResult = this.campaignRepository.getActive()
    if (!campaignResult.ok) {
      return mapRepositoryFailureResult(
        this.adapterId,
        campaignResult.error.code,
        campaignResult.error.message,
      )
    }

    const connectionResult = this.connectionRepository.loadState()
    if (!connectionResult.ok) {
      return mapRepositoryFailureResult(
        this.adapterId,
        connectionResult.error.code,
        connectionResult.error.message,
      )
    }

    const formsResult = this.executionRepository.loadAnnexureForms()
    if (!formsResult.ok) {
      return mapRepositoryFailureResult(
        this.adapterId,
        formsResult.error.code,
        formsResult.error.message,
      )
    }

    const followUpsResult = this.executionRepository.loadFollowUps()
    if (!followUpsResult.ok) {
      return mapRepositoryFailureResult(
        this.adapterId,
        followUpsResult.error.code,
        followUpsResult.error.message,
      )
    }

    const assignments = connectionResult.data.assignments.filter(
      (assignment) => !scope?.ruknId || assignment.ruknId === scope.ruknId,
    )
    const connectedCount = assignments.filter((assignment) => assignment.status === 'Active').length
    const pendingCount = assignments.filter(
      (assignment) => assignment.status !== 'Active' && assignment.status !== 'Completed',
    ).length

    const forms = formsResult.data.filter(
      (form) => !scope?.ruknId || form.ruknId === scope.ruknId,
    )
    const meetingsCompleted = forms.filter((form) => form.status === 'submitted').length
    const meetingsPending = forms.filter((form) => form.status === 'draft').length

    const followUps = followUpsResult.data.filter(
      (record) => !scope?.ruknId || record.ruknId === scope.ruknId,
    )
    const followUpsDue = followUps.filter((record) => record.status === 'Pending').length

    const metrics: AdapterDashboardMetric[] = [
      { key: 'connected_count', value: connectedCount },
      { key: 'pending_assignments', value: pendingCount },
      { key: 'meetings_completed', value: meetingsCompleted },
      { key: 'meetings_pending', value: meetingsPending },
      { key: 'follow_ups_due', value: followUpsDue },
    ]

    return adapterOk(
      {
        campaignId: campaignResult.data?.id,
        connectedCount,
        pendingCount,
        meetingsCompleted,
        meetingsPending,
        followUpsDue,
        metrics,
        generatedAt: Date.now(),
      },
      availability,
    )
  }
}
