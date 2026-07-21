/**
 * KC-0071 — Administrator Executive Dashboard (presentation only).
 * Reuses existing mission-control data helpers — no new queries or calculations engines.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES, adminExecutionPath } from '@/constants/routes'
import {
  buildAdminCampaignHealthKpis,
  buildAdminInterventionQueue,
  buildAdminRecentActivityView,
  buildAllActiveRuknPerformance,
  type AdminRuknGenderPerformanceView,
} from '@/lib/missionControl/adminMissionControlPresentation'
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
import { AdminHealthKpiCard } from './AdminHealthKpiCard'
import { resolveAdminHealthKpiPending } from './dashboardMetricReadiness'
import { LiveActivityFeed } from './LiveActivityFeed'
import { McProgressRing } from './McProgressRing'

type AdminCommandCenterProps = {
  model: AdminMissionControlModel
  snapshot: AdminCommandCenterSnapshot
  metricsReady?: boolean
}

const RUKN_PAGE_SIZE = 8

const SEVERITY_CLASS = {
  critical: 'exdash-severity-critical',
  attention: 'exdash-severity-attention',
  watch: 'exdash-severity-watch',
} as const

type OverviewMetric = {
  id: string
  label: string
  value: string | number
  hint?: string
}

function summarizeRukns(rows: AdminRuknGenderPerformanceView[]): OverviewMetric[] {
  const total = rows.length
  const assigned = rows.filter((r) => r.assignedKarkuns > 0).length
  const connected = rows.reduce((sum, r) => sum + r.assignedKarkuns, 0)
  const pending = rows.reduce((sum, r) => sum + r.pendingWork, 0)
  const avg =
    total === 0
      ? 0
      : Math.round(rows.reduce((sum, r) => sum + r.completionPct, 0) / total)
  const critical = rows.filter((r) => r.status.tone === 'red' && r.assignedKarkuns > 0).length

  return [
    { id: 'rukns', label: 'Total Rukns', value: total },
    { id: 'assigned', label: 'Assigned', value: assigned, hint: 'With connections' },
    { id: 'connected', label: 'Connected', value: connected, hint: 'Active Karkuns' },
    { id: 'pending', label: 'Pending', value: pending },
    { id: 'progress', label: 'Average Progress', value: `${avg}%` },
    { id: 'critical', label: 'Critical', value: critical },
  ]
}

function activityTone(message: string): 'completed' | 'transfer' | 'pending' | 'critical' | 'idle' {
  const lower = message.toLowerCase()
  if (/transfer|transferred/.test(lower)) return 'transfer'
  if (/critical|overdue|fail|denied|error/.test(lower)) return 'critical'
  if (/pending|await|due/.test(lower)) return 'pending'
  if (/complete|completed|approved|connected|assign|archiv/.test(lower)) return 'completed'
  return 'idle'
}

function RuknPerformanceCard({
  row,
  selected,
  onToggleSelected,
  onNotify,
  onAppreciate,
  onRemind,
}: {
  row: AdminRuknGenderPerformanceView
  selected: boolean
  onToggleSelected: (ruknId: string) => void
  onNotify: (ruknId: string) => void
  onAppreciate: (ruknId: string) => void
  onRemind: (ruknId: string) => void
}) {
  const rukn = getRuknById(row.ruknId)
  const tel = rukn?.mobile ? buildTelLink(rukn.mobile) : null
  const canMessage = Boolean(rukn?.mobile?.trim())
  const badge = dashboardPerformanceBadge(row.completionPct, row.assignedKarkuns)
  const showAppreciate = shouldOfferAppreciate(row.completionPct, row.assignedKarkuns)
  const showReminder = shouldOfferReminder(row.completionPct, row.assignedKarkuns)

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
            Connected: {row.assignedKarkuns}
            {row.pendingWork > 0 ? ` · Pending: ${row.pendingWork}` : ''}
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
              style={{ width: `${Math.max(0, Math.min(100, row.completionPct))}%` }}
            />
          </div>
          <span className="exdash-rukn-pct">{row.completionPct}%</span>
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

function PaginatedRuknGrid({
  rows,
  emptyLabel,
  selectedIds,
  onToggleSelected,
  onNotify,
  onAppreciate,
  onRemind,
}: {
  rows: AdminRuknGenderPerformanceView[]
  emptyLabel: string
  selectedIds: Set<string>
  onToggleSelected: (ruknId: string) => void
  onNotify: (ruknId: string) => void
  onAppreciate: (ruknId: string) => void
  onRemind: (ruknId: string) => void
}) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(rows.length / RUKN_PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const slice = rows.slice(safePage * RUKN_PAGE_SIZE, safePage * RUKN_PAGE_SIZE + RUKN_PAGE_SIZE)

  if (rows.length === 0) {
    return <p className="exdash-muted">{emptyLabel}</p>
  }

  return (
    <div className="space-y-3">
      <ul className="exdash-rukn-grid">
        {slice.map((row) => (
          <RuknPerformanceCard
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
            Page {safePage + 1} of {totalPages} · {rows.length} Rukns
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
        <p className="exdash-pager-meta">{rows.length} Rukns</p>
      )}
    </div>
  )
}

function OverviewMetricGrid({
  metrics,
  title,
}: {
  metrics: OverviewMetric[]
  title: string
}) {
  return (
    <section className="exdash-panel" aria-label={title}>
      <div className="exdash-section-head">
        <h2 className="exdash-section-title">{title}</h2>
      </div>
      <ul className="exdash-metric-grid">
        {metrics.map((metric) => (
          <li key={metric.id} className="exdash-metric-card">
            <p className="exdash-metric-label">{metric.label}</p>
            <p className="exdash-metric-value">{metric.value}</p>
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
  const { sendIndividualMessage, sendBroadcastMessage } = useCommunication()
  const [systemHistoryOpen, setSystemHistoryOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [composerError, setComposerError] = useState('')
  const [composer, setComposer] = useState<{
    open: boolean
    recipients: MessageRecipient[]
    title: string
    initialTemplateId?: string
    initialMessage?: string
  }>({ open: false, recipients: [], title: 'Compose WhatsApp Message' })

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

  const allRukns = useMemo(() => {
    void assignmentVersion
    if (!backgroundReady) return []
    return buildAllActiveRuknPerformance()
  }, [assignmentVersion, backgroundReady])

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
        { id: 'assigned', label: 'Assigned', value: '—' },
        {
          id: 'connected',
          label: 'Connected',
          value: metricsReady ? model.connectionProgress.connected : '—',
        },
        { id: 'pending', label: 'Pending', value: '—' },
        {
          id: 'progress',
          label: 'Average Progress',
          value: metricsReady ? `${model.connectionProgress.pct}%` : '—',
        },
        {
          id: 'critical',
          label: 'Critical',
          value: metricsReady ? model.campaignHealth.criticalFollowUps : '—',
        },
      ] satisfies OverviewMetric[]
    }
    const base = summarizeRukns(allRukns)
    return base.map((metric) =>
      metric.id === 'connected'
        ? {
            ...metric,
            value: metricsReady ? model.connectionProgress.connected : metric.value,
            hint: 'Canonical connected',
          }
        : metric,
    )
  }, [allRukns, backgroundReady, metricsReady, model])

  const maleMetrics = useMemo(() => summarizeRukns(maleRukns), [maleRukns])
  const femaleMetrics = useMemo(() => summarizeRukns(femaleRukns), [femaleRukns])

  const systemHistory = useMemo(() => {
    void assignmentVersion
    if (!backgroundReady) return []
    return buildAdminRecentActivityView(8)
  }, [assignmentVersion, backgroundReady])

  return (
    <div className="exdash-stack">
      <OverviewMetricGrid title="Collective Overview" metrics={collectiveMetrics} />

      <section className="exdash-panel" aria-label="Campaign health">
        <div className="exdash-section-head">
          <h2 className="exdash-section-title">Campaign Health</h2>
          <Link to={adminExecutionPath()} className="exdash-section-link">
            Overview →
          </Link>
        </div>
        <ul className="exdash-health-grid" aria-label="Campaign health KPIs">
          {healthKpis.map((kpi) => (
            <AdminHealthKpiCard
              key={kpi.id}
              kpi={kpi}
              metricsReady={metricsReady}
              backgroundReady={backgroundReady}
            />
          ))}
        </ul>
      </section>

      {backgroundReady ? <PendingKarkunRequestQueue /> : null}

      <section className="exdash-panel exdash-panel-emphasis" aria-label="Intervention queue">
        <div className="exdash-section-head">
          <h2 className="exdash-section-title">Intervention Queue</h2>
          <span className="exdash-section-meta">
            {!backgroundReady
              ? 'Loading'
              : interventions.length === 0
                ? 'Clear'
                : `${interventions.length} prioritized`}
          </span>
        </div>
        {!backgroundReady ? (
          <p className="exdash-muted" aria-busy="true">
            Loading campaign data…
          </p>
        ) : interventions.length === 0 ? (
          <p className="exdash-muted">No urgent interventions right now.</p>
        ) : (
          <ol className="exdash-queue">
            {interventions.map((item, index) => (
              <li key={item.id}>
                <Link to={item.route} className={`exdash-queue-item ${SEVERITY_CLASS[item.severity]}`}>
                  <span className="exdash-queue-rank" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="exdash-queue-body">
                    <span className="exdash-queue-title">{item.title}</span>
                    <span className="exdash-queue-detail">{item.detail}</span>
                  </div>
                  <span className={`exdash-queue-badge ${SEVERITY_CLASS[item.severity]}`}>
                    {item.severity}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <OverviewMetricGrid title="Male Overview" metrics={maleMetrics} />
      <section className="exdash-panel" aria-label="Male Rukn performance">
        <div className="exdash-section-head">
          <h2 className="exdash-section-title">Male Rukn Performance</h2>
          <Link to={ROUTES.ADMIN_RUKN} className="exdash-section-link">
            All Rukns →
          </Link>
        </div>
        {!backgroundReady ? (
          <p className="exdash-muted" aria-busy="true">
            Loading campaign data…
          </p>
        ) : (
          <PaginatedRuknGrid
            rows={maleRukns}
            emptyLabel="No Male Rukns found."
            selectedIds={selectedIds}
            onToggleSelected={toggleSelected}
            onNotify={openNotify}
            onAppreciate={openAppreciate}
            onRemind={openRemind}
          />
        )}
      </section>

      <OverviewMetricGrid title="Female Overview" metrics={femaleMetrics} />
      <section className="exdash-panel" aria-label="Female Rukn performance">
        <div className="exdash-section-head">
          <h2 className="exdash-section-title">Female Rukn Performance</h2>
          <Link to={ROUTES.ADMIN_RUKN} className="exdash-section-link">
            All Rukns →
          </Link>
        </div>
        {!backgroundReady ? (
          <p className="exdash-muted" aria-busy="true">
            Loading campaign data…
          </p>
        ) : (
          <PaginatedRuknGrid
            rows={femaleRukns}
            emptyLabel="No Female Rukns found."
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

      <LiveActivityFeed ready={backgroundReady} limit={8} />

      {metricsReady ? (
        <section className="exdash-panel exdash-progress-aside" aria-label="Campaign progress summary">
          <div className="exdash-section-head">
            <h2 className="exdash-section-title">Campaign Pulse</h2>
          </div>
          <div className="exdash-pulse-row">
            <McProgressRing
              value={model.connectionProgress.pct}
              size={72}
              stroke={8}
              tone="green"
              label={`${model.connectionProgress.pct}%`}
              sublabel="Complete"
            />
            <dl className="exdash-pulse-metrics">
              <div>
                <dt>Connected</dt>
                <dd>{model.connectionProgress.connected}</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>{model.connectionProgress.remaining}</dd>
              </div>
              <div>
                <dt>Days left</dt>
                <dd>{model.daysRemaining ?? '—'}</dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}

      <section className="exdash-system-history" aria-label="Recent system history">
        <button
          type="button"
          className="exdash-system-history-toggle"
          aria-expanded={systemHistoryOpen}
          onClick={() => setSystemHistoryOpen((open) => !open)}
        >
          <span>
            Recent System History ({systemHistory.length || 0})
          </span>
          <span aria-hidden="true">{systemHistoryOpen ? '▲ Collapse' : '▼ Expand'}</span>
        </button>
        {systemHistoryOpen ? (
          !backgroundReady ? (
            <p className="exdash-muted mt-2" aria-busy="true">
              Loading…
            </p>
          ) : systemHistory.length === 0 ? (
            <p className="exdash-muted mt-2">No system history yet.</p>
          ) : (
            <ul className="exdash-system-history-list">
              {systemHistory.map((item) => (
                <li
                  key={item.id}
                  className={`exdash-system-history-item exdash-history-${activityTone(item.message)}`}
                >
                  <span className="exdash-history-dot" aria-hidden="true" />
                  <div>
                    <p className="exdash-system-history-message">{item.message}</p>
                    <p className="exdash-history-time">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      <MessageComposerModal
        isOpen={composer.open}
        recipients={composer.recipients}
        title={composer.title}
        initialTemplateId={composer.initialTemplateId}
        initialMessage={composer.initialMessage}
        onClose={() => setComposer((current) => ({ ...current, open: false }))}
        onSend={async (input) => {
          if (composer.recipients.length === 1) {
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
          }
          const result = await sendBroadcastMessage({
            channel: 'whatsapp',
            recipients: composer.recipients,
            templateId: input.templateId,
            message: input.message,
          })
          if (result.success > 0) {
            clearSelection()
            setComposer((current) => ({ ...current, open: false }))
            return { success: true }
          }
          return {
            success: false,
            error: result.failed[0]?.error ?? 'Broadcast failed.',
          }
        }}
      />
    </div>
  )
}
