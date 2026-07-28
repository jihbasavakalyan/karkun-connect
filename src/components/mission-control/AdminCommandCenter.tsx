/**
 * Campaign Operations Command Center (presentation / IA only).
 * KC-0102E restores executive overview surfaces without new queries or calculation engines.
 * Preserves KC-0102A readiness, KC-0102B coalescing, and KC-0102C read elimination.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'
import { ROUTES } from '@/constants/routes'
import {
  buildAdminCampaignHealthKpis,
  buildAdminInterventionQueue,
  buildAllActiveRuknPerformance,
  type AdminRuknGenderPerformanceView,
} from '@/lib/missionControl/adminMissionControlPresentation'
import {
  USE_ADMIN_ACTION_CENTER_EXPERIMENT,
} from '@/lib/missionControl/adminDashboardOpsExperiment'
import {
  buildCampaignOperationsHealthMetrics,
  buildCampaignOperationsTrends,
  buildTodaysMissionOperationalItems,
  buildTopPriorityRukns,
  type TopPriorityRuknView,
} from '@/lib/missionControl/campaignOperationsCommandCenter'
import {
  buildAdminAttentionRequired,
  buildAdminCampaignProgressCards,
  buildAdminNextActions,
  buildAdminQuickActions,
} from '@/lib/missionControl/adminCommandCenterWorkflow'
import { AdminActionCenter } from './AdminActionCenter'
import { AdminOpsThreeColumnLayout } from './AdminOpsThreeColumnLayout'
import { NextBestActionsPanel } from './NextBestActionsPanel'
import { NextActionsPanel } from './NextActionsPanel'
import { AttentionRequiredPanel } from './AttentionRequiredPanel'
import { CampaignProgressPanel } from './CampaignProgressPanel'
import { AdminQuickActionsPanel } from './AdminQuickActionsPanel'
import { runPriorityEngine, type PriorityItem } from '@/lib/priorityIntelligence'
import {
  buildAppreciationDraft,
  buildReminderDraft,
  buildRuknMessageRecipient,
  buildRuknMessageRecipients,
  dashboardPerformanceBadge,
  shouldOfferAppreciate,
  shouldOfferReminder,
} from '@/lib/missionControl/dashboardCommunicationDrafts'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import type { MessageRecipient } from '@/types/communication'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useBackgroundHydration } from '@/hooks/useBackgroundHydration'
import { useCommunication } from '@/hooks/useCommunication'
import { PendingKarkunRequestsLaunchPanel } from './PendingKarkunRequestsLaunchPanel'
import { MessageComposerModal } from '@/components/communication/MessageComposerModal'
import { useContextAwareCommunication } from '@/hooks/useContextAwareCommunication'
import {
  communicationContextFromMissionItemId,
  pendingMatter,
} from '@/lib/communication/contextAware'
import type { AdminActionCenterItem } from '@/lib/missionControl/adminDashboardOpsExperiment'
import { dashState03WidgetRender } from '@/lib/debug/kc00586DashboardStateProbe'
import { createCoalescedNotifier } from '@/lib/dashboard/coalesceStoreNotifications'
import { getRuknById } from '@/data/ruknMaster'
import { buildTelLink } from '@/utils/personContactLinks'
import { resolveAdminHealthKpiPending } from './dashboardMetricReadiness'
import { CampaignHealthPanel } from './CampaignHealthPanel'
import { ProgressTrendsPanel } from './ProgressTrendsPanel'
import { ActivityTimeline } from './ActivityTimeline'
import { WidgetErrorBoundary } from './WidgetErrorBoundary'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'

type AdminCommandCenterProps = {
  model: AdminMissionControlModel
  snapshot: AdminCommandCenterSnapshot
  metricsReady?: boolean
}

const PRIORITY_PAGE_SIZE = 8

function PriorityRuknCard({
  row,
  selected,
  onToggleSelected,
  onNotify,
  onAppreciate,
  onRemind,
}: {
  row: TopPriorityRuknView
  selected: boolean
  onToggleSelected: (ruknId: string) => void
  onNotify: (ruknId: string) => void
  onAppreciate: (ruknId: string) => void
  onRemind: (ruknId: string) => void
}) {
  const rukn = getRuknById(row.ruknId)
  const tel = rukn?.mobile ? buildTelLink(rukn.mobile) : null
  const canMessage = Boolean(rukn?.mobile?.trim())
  const badge = dashboardPerformanceBadge(row.priorityScore, row.assignedKarkuns)
  const showAppreciate = shouldOfferAppreciate(row.priorityScore, row.assignedKarkuns)
  const showReminder = shouldOfferReminder(row.priorityScore, row.assignedKarkuns)

  return (
    <li className={`exdash-rukn-card${selected ? ' exdash-rukn-card-selected' : ''}`}>
      <div className="exdash-rukn-card-top">
        <label className="exdash-rukn-select">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected(row.ruknId)}
            aria-label={`Select ${row.ruknName}`}
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="exdash-rukn-name">{row.ruknName}</p>
          <p className="exdash-rukn-meta">
            Priority score: {row.priorityScore}% · Connected: {row.assignedKarkuns}
            {row.pendingWork > 0 ? ` · Pending work: ${row.pendingWork}` : ''}
          </p>
          <p className="exdash-rukn-modules">
            V {row.modulePct.visits}% · I {row.modulePct.weeklyIjtema}% · B{' '}
            {row.modulePct.monthlyBaitulMaal}% · A {row.modulePct.appRegistration}%
          </p>
        </div>
        <span className={`exdash-status-badge exdash-status-${badge.tone}`}>
          {badge.icon} {badge.label}
        </span>
      </div>
      <div className="exdash-rukn-card-bottom">
        <div className="exdash-rukn-progress" aria-hidden="true">
          <div className="exdash-rukn-progress-track">
            <div
              className="exdash-rukn-progress-fill"
              style={{ width: `${Math.max(0, Math.min(100, row.priorityScore))}%` }}
            />
          </div>
          <span className="exdash-rukn-pct">{row.priorityScore}%</span>
        </div>
      </div>
      <div className="exdash-rukn-actions" role="group" aria-label={`Actions for ${row.ruknName}`}>
        <Link to={row.route} className="exdash-action-btn">
          View
        </Link>
        <button
          type="button"
          className="exdash-action-btn"
          disabled={!canMessage}
          onClick={() => onNotify(row.ruknId)}
          title={canMessage ? 'Notify via Communication module' : 'No mobile number'}
        >
          Notify
        </button>
        {tel ? (
          <a className="exdash-action-btn" href={tel}>
            Call
          </a>
        ) : (
          <button type="button" className="exdash-action-btn" disabled title="No mobile number">
            Call
          </button>
        )}
        <button
          type="button"
          className="exdash-action-btn"
          disabled={!canMessage}
          onClick={() => onNotify(row.ruknId)}
          title={canMessage ? 'WhatsApp via Communication module' : 'No mobile number'}
        >
          WhatsApp
        </button>
        {showAppreciate ? (
          <button
            type="button"
            className="exdash-action-btn exdash-action-accent"
            disabled={!canMessage}
            onClick={() => onAppreciate(row.ruknId)}
          >
            👏 Appreciate
          </button>
        ) : null}
        {showReminder ? (
          <button
            type="button"
            className="exdash-action-btn exdash-action-warn"
            disabled={!canMessage}
            onClick={() => onRemind(row.ruknId)}
          >
            🔔 Guidance
          </button>
        ) : null}
      </div>
    </li>
  )
}

function PaginatedPriorityGrid({
  rows,
  selectedIds,
  onToggleSelected,
  onNotify,
  onAppreciate,
  onRemind,
}: {
  rows: TopPriorityRuknView[]
  selectedIds: Set<string>
  onToggleSelected: (ruknId: string) => void
  onNotify: (ruknId: string) => void
  onAppreciate: (ruknId: string) => void
  onRemind: (ruknId: string) => void
}) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(rows.length / PRIORITY_PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const slice = rows.slice(safePage * PRIORITY_PAGE_SIZE, safePage * PRIORITY_PAGE_SIZE + PRIORITY_PAGE_SIZE)

  if (rows.length === 0) {
    return <p className="exdash-muted">No active Rukns with connections.</p>
  }

  return (
    <div className="space-y-3">
      <ul className="exdash-rukn-grid">
        {slice.map((row) => (
          <PriorityRuknCard
            key={row.ruknId}
            row={row}
            selected={selectedIds.has(row.ruknId)}
            onToggleSelected={onToggleSelected}
            onNotify={onNotify}
            onAppreciate={onAppreciate}
            onRemind={onRemind}
          />
        ))}
      </ul>
      {totalPages > 1 ? (
        <div className="exdash-pager">
          <button
            type="button"
            className="exdash-pager-btn"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span className="exdash-pager-meta">
            Page {safePage + 1} of {totalPages} · {rows.length} priority Rukns
          </span>
          <button
            type="button"
            className="exdash-pager-btn"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      ) : (
        <p className="exdash-pager-meta">{rows.length} priority Rukns</p>
      )}
    </div>
  )
}

type SectionTone = 'sky' | 'amber' | 'rose' | 'violet' | 'slate' | 'teal'

type OverviewMetric = {
  id: string
  label: string
  value: string | number
  hint?: string
  /** Optional 0–100 progress fill under the value (presentation only). */
  progressPct?: number
}

function ExdashSectionTitle({
  title,
  icon,
  tone,
}: {
  title: string
  icon: IconName
  tone: SectionTone
}) {
  return (
    <h2 className={`exdash-section-title exdash-section-title-${tone}`}>
      <span className={`exdash-section-icon exdash-section-icon-${tone}`} aria-hidden="true">
        <Icon name={icon} size="sm" />
      </span>
      {title}
    </h2>
  )
}

/** KC-0102E — Collective Overview KPIs from existing Rukn performance rows. */
function summarizeCollectiveRukns(rows: AdminRuknGenderPerformanceView[]): OverviewMetric[] {
  const total = rows.length
  const assigned = rows.filter((r) => r.assignedKarkuns > 0).length
  const connected = rows.reduce((sum, r) => sum + r.assignedKarkuns, 0)
  const pending = rows.reduce((sum, r) => sum + r.pendingWork, 0)
  const avg =
    total === 0 ? 0 : Math.round(rows.reduce((sum, r) => sum + r.completionPct, 0) / total)
  const critical = rows.filter((r) => r.status.tone === 'red' && r.assignedKarkuns > 0).length

  return [
    { id: 'rukns', label: 'Total Rukns', value: total },
    { id: 'assigned', label: 'With Connections', value: assigned, hint: 'At least one Connected Karkun' },
    { id: 'connected', label: 'Connected', value: connected, hint: 'Active Connected Karkuns' },
    { id: 'pending', label: 'Pending', value: pending, hint: 'Visits and tasks not yet completed' },
    { id: 'progress', label: 'Average Progress', value: `${avg}%`, progressPct: avg },
    { id: 'critical', label: 'Critical', value: critical, hint: 'Rukns behind on progress' },
  ]
}

/** KC-0102E — Male/Female Rukn connection summary from existing performance rows. */
function summarizeGenderRukns(rows: AdminRuknGenderPerformanceView[]): OverviewMetric[] {
  const total = rows.length
  const assigned = rows.filter((r) => r.assignedKarkuns > 0).length
  const connected = rows.reduce((sum, r) => sum + r.assignedKarkuns, 0)
  const pending = rows.reduce((sum, r) => sum + r.pendingWork, 0)
  const connectionPct = total === 0 ? 0 : Math.round((assigned / total) * 100)
  const progressPct =
    total === 0 ? 0 : Math.round(rows.reduce((sum, r) => sum + r.completionPct, 0) / total)

  return [
    { id: 'total', label: 'Total', value: total },
    { id: 'assigned', label: 'With Connections', value: assigned },
    { id: 'connected', label: 'Connected', value: connected },
    { id: 'pending', label: 'Pending', value: pending },
    {
      id: 'connection-pct',
      label: 'Connection %',
      value: `${connectionPct}%`,
      progressPct: connectionPct,
      hint: 'Rukns with at least one Connected Karkun',
    },
    {
      id: 'progress',
      label: 'Progress',
      value: `${progressPct}%`,
      progressPct,
      hint: 'Average completion across Rukns',
    },
  ]
}

function OverviewMetricGrid({
  metrics,
  title,
  icon,
  tone,
}: {
  metrics: OverviewMetric[]
  title: string
  icon: IconName
  tone: SectionTone
}) {
  return (
    <section className="exdash-panel" aria-label={title}>
      <div className="exdash-section-head">
        <ExdashSectionTitle title={title} icon={icon} tone={tone} />
        <span className="exdash-section-meta">Executive summary</span>
      </div>
      <ul className="exdash-metric-grid">
        {metrics.map((metric) => (
          <li key={metric.id} className="exdash-metric-card">
            <p className="exdash-metric-label">{metric.label}</p>
            <p className="exdash-metric-value">{metric.value}</p>
            {typeof metric.progressPct === 'number' ? (
              <div
                className="exdash-progress-track"
                role="progressbar"
                aria-valuenow={metric.progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${metric.label} ${metric.progressPct}%`}
              >
                <div
                  className="exdash-progress-fill"
                  style={{ width: `${Math.max(0, Math.min(100, metric.progressPct))}%` }}
                />
              </div>
            ) : null}
            {metric.hint ? <p className="exdash-metric-hint">{metric.hint}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function AdminCommandCenter({
  model,
  snapshot,
  metricsReady = true,
}: AdminCommandCenterProps) {
  const { assignmentVersion } = useAssignmentEngine()
  const backgroundReady = useBackgroundHydration()
  const { sendIndividualMessage } = useCommunication()
  const { openCommunication, previewModal } = useContextAwareCommunication()
  const [searchParams] = useSearchParams()
  const showAllTasks =
    USE_ADMIN_ACTION_CENTER_EXPERIMENT && searchParams.get('view') === 'all-tasks'
  const [moduleTick, setModuleTick] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [composerError, setComposerError] = useState('')
  const [composer, setComposer] = useState<{
    open: boolean
    recipients: MessageRecipient[]
    title: string
    initialTemplateId?: string
    initialMessage?: string
  }>({ open: false, recipients: [], title: 'Compose WhatsApp Message' })

  useEffect(() => {
    // KC-0102B — coalesce module store storms into one tick per logical transition.
    const coalesced = createCoalescedNotifier(() => {
      setModuleTick((v) => v + 1)
    })
    const unsubs = [
      subscribeToWeeklyIjtemaStore(coalesced.bump),
      subscribeToMonthlyBaitulMaalStore(coalesced.bump),
      subscribeToAnnexure1Store(coalesced.bump),
      subscribeToJihWebPortalStore(coalesced.bump),
      subscribeToFollowUpStore(coalesced.bump),
    ]
    return () => {
      coalesced.dispose()
      for (const unsub of unsubs) unsub()
    }
  }, [])

  const toggleSelected = (ruknId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(ruknId)) next.delete(ruknId)
      else next.add(ruknId)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const openComposer = (input: {
    recipients: MessageRecipient[]
    title: string
    initialTemplateId?: string
    initialMessage?: string
  }) => {
    if (input.recipients.length === 0) {
      setComposerError('Selected Rukn(s) have no mobile number for WhatsApp.')
      return
    }
    setComposerError('')
    setComposer({ open: true, ...input })
  }

  const openNotify = (ruknId: string) => {
    const recipient = buildRuknMessageRecipient(ruknId)
    if (!recipient) {
      setComposerError('This Rukn has no mobile number.')
      return
    }
    setComposerError('')
    openCommunication({
      context: 'no-activity',
      recipients: [recipient],
      pendingMatters: [
        pendingMatter('progress', `${recipient.name}: مہم کی پیش رفت توجہ طلب ہے`),
      ],
    })
  }

  const openMissionNotify = (item: AdminActionCenterItem) => {
    const context = communicationContextFromMissionItemId(item.id)
    if (!context) {
      setComposerError('No communication context for this task.')
      return
    }
    setComposerError('')
    openCommunication({ context })
  }

  /** KC-0120 — Notify from Priority Intelligence (same Communication Preview path). */
  const openPriorityNotify = (item: PriorityItem) => {
    const context = item.recommendedAction.communicationContext
    if (!context) {
      setComposerError('No communication context for this priority.')
      return
    }
    setComposerError('')
    const recipients =
      item.responsibleRuknIds && item.responsibleRuknIds.length > 0
        ? buildRuknMessageRecipients(item.responsibleRuknIds)
        : undefined
    openCommunication({
      context,
      recipients: recipients && recipients.length > 0 ? recipients : undefined,
    })
  }

  const openAppreciate = (ruknId: string) => {
    const recipient = buildRuknMessageRecipient(ruknId)
    if (!recipient) {
      setComposerError('This Rukn has no mobile number.')
      return
    }
    openComposer({
      recipients: [recipient],
      title: `Appreciate ${recipient.name}`,
      initialTemplateId: 'tpl-thank-you',
      initialMessage: buildAppreciationDraft(recipient.name),
    })
  }

  const openRemind = (ruknId: string) => {
    const recipient = buildRuknMessageRecipient(ruknId)
    if (!recipient) {
      setComposerError('This Rukn has no mobile number.')
      return
    }
    openComposer({
      recipients: [recipient],
      title: `Remind ${recipient.name}`,
      initialTemplateId: 'tpl-visit-reminder',
      initialMessage: buildReminderDraft(recipient.name),
    })
  }

  const openBulk = (mode: 'notify' | 'appreciate' | 'remind') => {
    const ids = [...selectedIds]
    const recipients = buildRuknMessageRecipients(ids)
    if (recipients.length === 0) {
      setComposerError('Selected Rukns have no mobile numbers.')
      return
    }
    if (mode === 'appreciate') {
      openComposer({
        recipients,
        title: `Appreciate ${recipients.length} Rukns`,
        initialTemplateId: 'tpl-thank-you',
        initialMessage: buildAppreciationDraft('dear brother / sister'),
      })
      return
    }
    if (mode === 'remind') {
      openComposer({
        recipients,
        title: `Remind ${recipients.length} Rukns`,
        initialTemplateId: 'tpl-visit-reminder',
        initialMessage: buildReminderDraft('dear brother / sister'),
      })
      return
    }
    openCommunication({
      context: 'no-activity',
      recipients,
      pendingMatters: [
        pendingMatter('bulk', `${recipients.length} ارکان: پیش رفت کی صورتِ حال توجہ طلب ہے`),
      ],
      audienceLabel: `${recipients.length} Rukns`,
    })
  }

  // Retain legacy health KPI probe wiring (KC-0058.6) without rendering duplicate surfaces.
  const healthKpis = useMemo(() => {
    void assignmentVersion
    return buildAdminCampaignHealthKpis(model)
  }, [model, assignmentVersion])

  useEffect(() => {
    for (const kpi of healthKpis) {
      const pending = resolveAdminHealthKpiPending(kpi.id, metricsReady, backgroundReady)
      dashState03WidgetRender(
        kpi.id === 'connections'
          ? 'Connections'
          : kpi.id === 'visits-done'
            ? 'Visits'
            : kpi.id === 'visits-pending'
              ? 'Pending'
              : kpi.id === 'follow-ups'
                ? 'FollowUps'
                : kpi.id === 'development'
                  ? 'Development'
                  : `Health:${kpi.id}`,
        pending ? 'loading' : 'ready',
        { value: kpi.value, metricsReady, backgroundReady, pending },
      )
    }
  }, [healthKpis, metricsReady, backgroundReady])

  const interventions = useMemo(() => {
    void assignmentVersion
    if (!backgroundReady) return []
    return buildAdminInterventionQueue(snapshot)
  }, [snapshot, assignmentVersion, backgroundReady])

  useEffect(() => {
    dashState03WidgetRender(
      'InterventionQueue',
      backgroundReady ? (interventions.length === 0 ? 'empty' : 'ready') : 'loading',
      { count: interventions.length, backgroundReady },
    )
  }, [interventions, backgroundReady])

  const missionItems = useMemo(() => {
    void assignmentVersion
    void moduleTick
    if (!backgroundReady) return []
    return buildTodaysMissionOperationalItems()
  }, [assignmentVersion, moduleTick, backgroundReady])

  /** KC-0120 — Priority Intelligence Engine (read-only; no UI-owned rules). */
  const priorityItems = useMemo(() => {
    void assignmentVersion
    void moduleTick
    if (!backgroundReady) return []
    return runPriorityEngine().priorities
  }, [assignmentVersion, moduleTick, backgroundReady])

  const campaignHealth = useMemo(() => {
    void assignmentVersion
    void moduleTick
    // KC-0102A — build as soon as critical hydrate lands so Visits can unlock;
    // background metric cards stay pending via CampaignHealthPanel gates.
    if (!metricsReady) return []
    return buildCampaignOperationsHealthMetrics()
  }, [assignmentVersion, moduleTick, metricsReady])

  /** KC-0127 — Command Center workflow surfaces (presentation only). */
  const nextActions = useMemo(() => {
    void assignmentVersion
    void moduleTick
    if (!backgroundReady) return []
    return buildAdminNextActions()
  }, [assignmentVersion, moduleTick, backgroundReady])

  const attentionItems = useMemo(() => {
    void assignmentVersion
    void moduleTick
    if (!backgroundReady) return []
    return buildAdminAttentionRequired()
  }, [assignmentVersion, moduleTick, backgroundReady])

  const campaignProgress = useMemo(() => {
    void assignmentVersion
    void moduleTick
    if (!metricsReady) return []
    return buildAdminCampaignProgressCards()
  }, [assignmentVersion, moduleTick, metricsReady])

  const quickActions = useMemo(() => buildAdminQuickActions(), [])

  useEffect(() => {
    dashState03WidgetRender(
      'CampaignHealth',
      metricsReady ? 'ready' : 'loading',
      {
        metrics: campaignHealth.map((metric) => ({
          id: metric.id,
          pct: metric.pct,
          current: metric.current,
          total: metric.total,
        })),
        metricsReady,
        backgroundReady,
      },
    )
  }, [campaignHealth, metricsReady, backgroundReady])

  const priorityRukns = useMemo(() => {
    void assignmentVersion
    void moduleTick
    if (!backgroundReady) return []
    return buildTopPriorityRukns(24)
  }, [assignmentVersion, moduleTick, backgroundReady])

  const trends = useMemo(() => {
    void assignmentVersion
    void moduleTick
    if (!backgroundReady) return []
    return buildCampaignOperationsTrends()
  }, [assignmentVersion, moduleTick, backgroundReady])

  // KC-0102E — executive overview metrics from existing presentation helpers only.
  const allRukns = useMemo(() => {
    void assignmentVersion
    void moduleTick
    if (!backgroundReady) return []
    return buildAllActiveRuknPerformance()
  }, [assignmentVersion, moduleTick, backgroundReady])

  const maleRukns = useMemo(
    () => allRukns.filter((row) => row.gender === 'Male'),
    [allRukns],
  )
  const femaleRukns = useMemo(
    () => allRukns.filter((row) => row.gender === 'Female'),
    [allRukns],
  )

  const collectiveMetrics = useMemo(() => {
    if (!backgroundReady) {
      return [
        { id: 'rukns', label: 'Total Rukns', value: '—' },
        { id: 'assigned', label: 'With Connections', value: '—' },
        { id: 'connected', label: 'Connected', value: '—' },
        { id: 'pending', label: 'Pending', value: '—' },
        { id: 'progress', label: 'Average Progress', value: '—' },
        { id: 'critical', label: 'Critical', value: '—' },
      ] satisfies OverviewMetric[]
    }
    const base = summarizeCollectiveRukns(allRukns)
    return base.map((metric) =>
      metric.id === 'connected'
        ? {
            ...metric,
            value: metricsReady ? model.connectionProgress.connected : metric.value,
            hint: 'Active Connected Karkuns',
          }
        : metric,
    )
  }, [allRukns, backgroundReady, metricsReady, model.connectionProgress.connected])

  const maleMetrics = useMemo(() => {
    if (!backgroundReady) {
      return [
        { id: 'total', label: 'Total', value: '—' },
        { id: 'assigned', label: 'With Connections', value: '—' },
        { id: 'connected', label: 'Connected', value: '—' },
        { id: 'pending', label: 'Pending', value: '—' },
        { id: 'connection-pct', label: 'Connection %', value: '—' },
        { id: 'progress', label: 'Progress', value: '—' },
      ] satisfies OverviewMetric[]
    }
    return summarizeGenderRukns(maleRukns)
  }, [backgroundReady, maleRukns])

  const femaleMetrics = useMemo(() => {
    if (!backgroundReady) {
      return [
        { id: 'total', label: 'Total', value: '—' },
        { id: 'assigned', label: 'With Connections', value: '—' },
        { id: 'connected', label: 'Connected', value: '—' },
        { id: 'pending', label: 'Pending', value: '—' },
        { id: 'connection-pct', label: 'Connection %', value: '—' },
        { id: 'progress', label: 'Progress', value: '—' },
      ] satisfies OverviewMetric[]
    }
    return summarizeGenderRukns(femaleRukns)
  }, [backgroundReady, femaleRukns])

  return (
    <div className="exdash-stack">
      {showAllTasks ? (
        <WidgetErrorBoundary title="All tasks">
          <AdminActionCenter
            items={missionItems}
            backgroundReady={backgroundReady}
            variant="full"
            onNotify={openMissionNotify}
          />
        </WidgetErrorBoundary>
      ) : (
        <>
          {/* KC-0127 — Quick Actions stay visible without scrolling the stack */}
          <WidgetErrorBoundary title="Quick Actions">
            <AdminQuickActionsPanel actions={quickActions} />
          </WidgetErrorBoundary>

          <WidgetErrorBoundary title="Next Actions">
            <NextActionsPanel items={nextActions} ready={backgroundReady} />
          </WidgetErrorBoundary>

          <WidgetErrorBoundary title="Attention Required">
            <AttentionRequiredPanel items={attentionItems} ready={backgroundReady} />
          </WidgetErrorBoundary>

          <WidgetErrorBoundary title="Campaign Progress">
            <CampaignProgressPanel cards={campaignProgress} ready={metricsReady} />
          </WidgetErrorBoundary>

          {/* KC-0102E — Executive Collective Overview (before Campaign Health) */}
          <WidgetErrorBoundary title="Collective Overview">
            <OverviewMetricGrid
              title="Collective Overview"
              metrics={collectiveMetrics}
              icon="chart"
              tone="slate"
            />
          </WidgetErrorBoundary>

          {/* KC-0102E — Male / Female Rukn connection summaries */}
          <WidgetErrorBoundary title="Male Rukns">
            <OverviewMetricGrid
              title="Male Rukns"
              metrics={maleMetrics}
              icon="users"
              tone="sky"
            />
          </WidgetErrorBoundary>

          <WidgetErrorBoundary title="Female Rukns">
            <OverviewMetricGrid
              title="Female Rukns"
              metrics={femaleMetrics}
              icon="users"
              tone="violet"
            />
          </WidgetErrorBoundary>

          {/* Campaign Health — per-metric readiness (KC-0102A); unchanged contract */}
          <WidgetErrorBoundary title="Campaign Health">
            <CampaignHealthPanel
              metrics={campaignHealth}
              metricsReady={metricsReady}
              backgroundReady={backgroundReady}
            />
          </WidgetErrorBoundary>

          {/* Today's Mission — unchanged */}
          <WidgetErrorBoundary title="Today's Mission">
            {USE_ADMIN_ACTION_CENTER_EXPERIMENT ? (
              <AdminActionCenter
                items={missionItems}
                backgroundReady={backgroundReady}
                onNotify={openMissionNotify}
              />
            ) : (
              <AdminOpsThreeColumnLayout
                model={model}
                snapshot={snapshot}
                interventions={interventions}
                backgroundReady={backgroundReady}
              />
            )}
          </WidgetErrorBoundary>

          {/* KC-0120 — Next Best Actions from Priority Intelligence Engine */}
          <WidgetErrorBoundary title="Next Best Actions">
            <NextBestActionsPanel
              priorities={priorityItems}
              backgroundReady={backgroundReady}
              onNotify={openPriorityNotify}
            />
          </WidgetErrorBoundary>

          <WidgetErrorBoundary title="Pending Karkun Requests" compact>
            <PendingKarkunRequestsLaunchPanel backgroundReady={backgroundReady} />
          </WidgetErrorBoundary>

          {/* Top Priority Rukns — launch surface (KC-0106) */}
          <WidgetErrorBoundary title="Top Priority Rukns">
            <section className="exdash-panel" aria-label="Top Priority Rukns">
              <div className="exdash-section-head">
                <ExdashSectionTitle title="Top Priority Rukns" icon="users" tone="rose" />
                <Link to={ROUTES.ADMIN_RUKN} className="exdash-section-link">
                  All Rukns →
                </Link>
              </div>
              <p className="exdash-action-center-sub">
                Launch surface — open a Rukn to act. Ranked by equal weight across Visits, Weekly
                Ijtema, Monthly Baitul Maal, and App Registration (lowest score first).
              </p>
              {!backgroundReady ? (
                <p className="exdash-muted" aria-busy="true">
                  Loading campaign data…
                </p>
              ) : (
                <PaginatedPriorityGrid
                  rows={priorityRukns}
                  selectedIds={selectedIds}
                  onToggleSelected={toggleSelected}
                  onNotify={openNotify}
                  onAppreciate={openAppreciate}
                  onRemind={openRemind}
                />
              )}
            </section>
          </WidgetErrorBoundary>

          {selectedIds.size > 0 ? (
            <div className="exdash-bulk-bar" role="region" aria-label="Bulk Rukn communication">
              <p className="exdash-bulk-count">{selectedIds.size} selected</p>
              <div className="exdash-bulk-actions">
                <button type="button" className="exdash-action-btn" onClick={() => openBulk('notify')}>
                  Notify Selected
                </button>
                <button
                  type="button"
                  className="exdash-action-btn exdash-action-accent"
                  onClick={() => openBulk('appreciate')}
                >
                  Appreciate Selected
                </button>
                <button
                  type="button"
                  className="exdash-action-btn exdash-action-warn"
                  onClick={() => openBulk('remind')}
                >
                  Guidance to Selected
                </button>
                <button type="button" className="exdash-action-btn" onClick={clearSelection}>
                  Clear
                </button>
              </div>
            </div>
          ) : null}

          {composerError ? (
            <p className="exdash-muted" role="alert">
              {composerError}
            </p>
          ) : null}

          {/* Progress Trends */}
          <WidgetErrorBoundary title="Progress Trends">
            <ProgressTrendsPanel trends={trends} ready={backgroundReady} />
          </WidgetErrorBoundary>

          {/* Activity Timeline */}
          <WidgetErrorBoundary title="Activity Timeline">
            <ActivityTimeline ready={backgroundReady} limit={12} />
          </WidgetErrorBoundary>
        </>
      )}

      <MessageComposerModal
        isOpen={composer.open}
        recipients={composer.recipients}
        title={composer.title}
        initialTemplateId={composer.initialTemplateId}
        initialMessage={composer.initialMessage}
        onClose={() => setComposer((current) => ({ ...current, open: false }))}
        onBulkComplete={(report) => {
          if (report.successfullySent > 0) {
            clearSelection()
          }
          setComposer((current) => ({ ...current, open: false }))
        }}
        onSend={async (input) => {
          const result = await sendIndividualMessage({
            channel: 'whatsapp',
            recipient: composer.recipients[0]!,
            templateId: input.templateId,
            message: input.message,
          })
          if (result.success) {
            setComposer((current) => ({ ...current, open: false }))
            return { success: true }
          }
          return { success: false, error: result.error ?? 'Send failed.' }
        }}
      />
      {previewModal}
    </div>
  )
}
