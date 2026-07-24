/**
 * KC-0109 Scope 1 — Campaign Operations Command Center (presentation / IA only).
 * Reuses existing mission-control data helpers — no new queries or calculation engines.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'
import { ROUTES } from '@/constants/routes'
import {
  buildAdminCampaignHealthKpis,
  buildAdminInterventionQueue,
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
import { AdminActionCenter } from './AdminActionCenter'
import { AdminOpsThreeColumnLayout } from './AdminOpsThreeColumnLayout'
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
import { PendingKarkunRequestQueue } from '@/components/admin/PendingKarkunRequestQueue'
import { MessageComposerModal } from '@/components/communication/MessageComposerModal'
import { dashState03WidgetRender } from '@/lib/debug/kc00586DashboardStateProbe'
import { getRuknById } from '@/data/ruknMaster'
import { buildTelLink } from '@/utils/personContactLinks'
import { resolveAdminHealthKpiPending } from './dashboardMetricReadiness'
import { CampaignHealthPanel } from './CampaignHealthPanel'
import { ProgressTrendsPanel } from './ProgressTrendsPanel'
import { ActivityTimeline } from './ActivityTimeline'
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
            🔔 Reminder
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
    return <p className="exdash-muted">No active Rukns with assignments.</p>
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

export function AdminCommandCenter({
  model,
  snapshot,
  metricsReady = true,
}: AdminCommandCenterProps) {
  const { assignmentVersion } = useAssignmentEngine()
  const backgroundReady = useBackgroundHydration()
  const { sendIndividualMessage } = useCommunication()
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
    const unsubs = [
      subscribeToWeeklyIjtemaStore(() => setModuleTick((v) => v + 1)),
      subscribeToMonthlyBaitulMaalStore(() => setModuleTick((v) => v + 1)),
      subscribeToAnnexure1Store(() => setModuleTick((v) => v + 1)),
      subscribeToJihWebPortalStore(() => setModuleTick((v) => v + 1)),
      subscribeToFollowUpStore(() => setModuleTick((v) => v + 1)),
    ]
    return () => {
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
    openComposer({
      recipients: [recipient],
      title: `Notify ${recipient.name}`,
      initialTemplateId: 'tpl-visit-reminder',
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
    openComposer({
      recipients,
      title: `Notify ${recipients.length} Rukns`,
      initialTemplateId: 'tpl-visit-reminder',
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

  const campaignHealth = useMemo(() => {
    void assignmentVersion
    void moduleTick
    if (!metricsReady || !backgroundReady) return []
    return buildCampaignOperationsHealthMetrics()
  }, [assignmentVersion, moduleTick, metricsReady, backgroundReady])

  useEffect(() => {
    dashState03WidgetRender(
      'CampaignHealth',
      metricsReady && backgroundReady ? 'ready' : 'loading',
      {
        metrics: campaignHealth.map((metric) => ({
          id: metric.id,
          pct: metric.pct,
          current: metric.current,
          total: metric.total,
        })),
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

  return (
    <div className="exdash-stack">
      {showAllTasks ? (
        <AdminActionCenter
          items={missionItems}
          backgroundReady={backgroundReady}
          variant="full"
        />
      ) : (
        <>
          {/* 1. Campaign Health */}
          <CampaignHealthPanel
            metrics={campaignHealth}
            ready={metricsReady && backgroundReady}
          />

          {/* 2. Today's Mission */}
          {USE_ADMIN_ACTION_CENTER_EXPERIMENT ? (
            <AdminActionCenter items={missionItems} backgroundReady={backgroundReady} />
          ) : (
            <AdminOpsThreeColumnLayout
              model={model}
              snapshot={snapshot}
              interventions={interventions}
              backgroundReady={backgroundReady}
            />
          )}

          {backgroundReady ? <PendingKarkunRequestQueue /> : null}

          {/* 3. Top Priority Rukns */}
          <section className="exdash-panel" aria-label="Top Priority Rukns">
            <div className="exdash-section-head">
              <ExdashSectionTitle title="Top Priority Rukns" icon="users" tone="rose" />
              <Link to={ROUTES.ADMIN_RUKN} className="exdash-section-link">
                All Rukns →
              </Link>
            </div>
            <p className="exdash-action-center-sub">
              Ranked by equal weight across Visits, Weekly Ijtema, Monthly Baitul Maal, and App
              Registration (lowest score first).
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
                  Reminder to Selected
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

          {/* 4. Progress Trends */}
          <ProgressTrendsPanel trends={trends} ready={backgroundReady} />

          {/* 5. Activity Timeline */}
          <ActivityTimeline ready={backgroundReady} limit={12} />
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
    </div>
  )
}
