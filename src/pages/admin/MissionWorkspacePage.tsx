/**
 * KC-0121 — Mission Workspace page (unified operational work queue).
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/ui'
import { FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { useBackgroundHydration } from '@/hooks/useBackgroundHydration'
import { useContextAwareCommunication } from '@/hooks/useContextAwareCommunication'
import { buildRuknMessageRecipients } from '@/lib/missionControl/dashboardCommunicationDrafts'
import {
  getMissionWorkspaceFilterOptions,
  markWorkItemReviewed,
  runMissionWorkspaceEngine,
  subscribeToMissionWorkspaceReviews,
  type WorkItemStatus,
  type WorkQueueItem,
} from '@/lib/missionWorkspace'
import type { PrioritySeverity } from '@/lib/priorityIntelligence'
import { ROUTES } from '@/constants/routes'

const filterClassName =
  'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const SEVERITY_BADGE: Record<PrioritySeverity, string> = {
  Critical: 'exdash-severity-critical',
  High: 'exdash-severity-attention',
  Medium: 'exdash-severity-watch',
  Low: 'exdash-severity-watch',
}

const PRIORITIES: PrioritySeverity[] = ['Critical', 'High', 'Medium', 'Low']
const STATUSES: WorkItemStatus[] = ['Pending', 'Reviewed']

export function MissionWorkspacePage() {
  const backgroundReady = useBackgroundHydration()
  const { openCommunication, previewModal } = useContextAwareCommunication()
  const [reviewTick, setReviewTick] = useState(0)
  const [priority, setPriority] = useState<PrioritySeverity | ''>('')
  const [context, setContext] = useState('')
  const [responsiblePerson, setResponsiblePerson] = useState('')
  const [status, setStatus] = useState<WorkItemStatus | ''>('')
  const [search, setSearch] = useState('')
  const [actionNotice, setActionNotice] = useState('')

  useEffect(() => subscribeToMissionWorkspaceReviews(() => setReviewTick((v) => v + 1)), [])

  const filterOptions = useMemo(() => {
    void reviewTick
    if (!backgroundReady) return { contexts: [] as string[], responsiblePeople: [] as string[] }
    return getMissionWorkspaceFilterOptions()
  }, [backgroundReady, reviewTick])

  const snapshot = useMemo(() => {
    void reviewTick
    if (!backgroundReady) {
      return {
        generatedAt: '',
        items: [] as WorkQueueItem[],
        summary: {
          pending: 0,
          reviewed: 0,
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      }
    }
    return runMissionWorkspaceEngine({
      priority: priority || undefined,
      context: context || undefined,
      responsiblePerson: responsiblePerson || undefined,
      status: status || undefined,
      search: search || undefined,
    })
  }, [backgroundReady, reviewTick, priority, context, responsiblePerson, status, search])

  const openNotify = (item: WorkQueueItem) => {
    if (!item.communicationContext) {
      setActionNotice('No communication context for this work item.')
      return
    }
    setActionNotice('')
    const recipients =
      item.responsibleRuknIds && item.responsibleRuknIds.length > 0
        ? buildRuknMessageRecipients(item.responsibleRuknIds)
        : undefined
    openCommunication({
      context: item.communicationContext,
      recipients: recipients && recipients.length > 0 ? recipients : undefined,
    })
  }

  const onMarkReviewed = (item: WorkQueueItem) => {
    markWorkItemReviewed(item.id)
    setActionNotice(`Marked reviewed: ${item.title}`)
    window.setTimeout(() => setActionNotice(''), 1600)
  }

  return (
    <PageShell variant="wide">
      <PageHeader
        title="Mission Workspace"
        description="Unified work queue — complete campaign priorities from one inbox. Mark Reviewed is presentation-only and does not change campaign data."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-secondary">
        <Link to={ROUTES.ADMIN} className="exdash-section-link">
          ← Dashboard
        </Link>
        {backgroundReady ? (
          <span>
            {snapshot.summary.pending} pending · {snapshot.summary.reviewed} reviewed ·{' '}
            {snapshot.summary.total} in queue
          </span>
        ) : (
          <span aria-busy="true">Loading campaign data…</span>
        )}
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-surface-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className={`${FORM_LABEL_CLASS} flex flex-col gap-1 text-xs font-medium text-secondary`}>
          Priority
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as PrioritySeverity | '')}
            className={filterClassName}
          >
            <option value="">All</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className={`${FORM_LABEL_CLASS} flex flex-col gap-1 text-xs font-medium text-secondary`}>
          Context
          <select
            value={context}
            onChange={(event) => setContext(event.target.value)}
            className={filterClassName}
          >
            <option value="">All</option>
            {filterOptions.contexts.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className={`${FORM_LABEL_CLASS} flex flex-col gap-1 text-xs font-medium text-secondary`}>
          Responsible Person
          <select
            value={responsiblePerson}
            onChange={(event) => setResponsiblePerson(event.target.value)}
            className={filterClassName}
          >
            <option value="">All</option>
            {filterOptions.responsiblePeople.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className={`${FORM_LABEL_CLASS} flex flex-col gap-1 text-xs font-medium text-secondary`}>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as WorkItemStatus | '')}
            className={filterClassName}
          >
            <option value="">All</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className={`${FORM_LABEL_CLASS} flex flex-col gap-1 text-xs font-medium text-secondary`}>
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rukn, Karkun, context, matter…"
            className={filterClassName}
          />
        </label>
      </div>

      {actionNotice ? (
        <p className="mb-3 text-sm text-secondary" role="status">
          {actionNotice}
        </p>
      ) : null}

      <section className="exdash-panel exdash-action-center" aria-label="Work Queue">
        <div className="exdash-section-head">
          <div className="exdash-action-center-head">
            <h2 className="exdash-section-title exdash-section-title-amber">Work Queue</h2>
            <p className="exdash-action-center-sub">
              Sorted by priority, then oldest pending first
            </p>
          </div>
          <span className="exdash-section-meta">
            {!backgroundReady
              ? 'Loading'
              : snapshot.items.length === 0
                ? 'Clear'
                : `${snapshot.items.length} shown`}
          </span>
        </div>

        {!backgroundReady ? (
          <p className="exdash-muted" aria-busy="true">
            Loading campaign data…
          </p>
        ) : snapshot.items.length === 0 ? (
          <p className="exdash-muted">No work items match the current filters.</p>
        ) : (
          <ol className="exdash-action-list">
            {snapshot.items.map((item) => (
              <li key={item.id} className="exdash-action-row">
                <span
                  className={`exdash-queue-badge ${SEVERITY_BADGE[item.severity]}`}
                  aria-label={item.severity}
                >
                  {item.severity.toUpperCase()}
                </span>
                <div className="exdash-action-body">
                  <div className="exdash-action-title-row">
                    <span className="exdash-queue-title">{item.title}</span>
                    <span className="exdash-queue-badge exdash-severity-watch">{item.status}</span>
                  </div>
                  <span className="exdash-queue-detail">{item.reason}</span>
                  <span className="exdash-queue-detail">
                    Responsible: {item.responsiblePersonLabel} · Recommended:{' '}
                    {item.recommendedAction.recommendation}
                  </span>
                  <span className="exdash-queue-detail">Context: {item.contextLabel}</span>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
                  {item.openRoute ? (
                    <Link to={item.openRoute} className="exdash-action-cta">
                      Open
                    </Link>
                  ) : null}
                  {item.communicationContext ? (
                    <button
                      type="button"
                      className="exdash-action-cta"
                      onClick={() => openNotify(item)}
                    >
                      Notify
                    </button>
                  ) : null}
                  {item.status === 'Pending' ? (
                    <button
                      type="button"
                      className="exdash-action-cta"
                      onClick={() => onMarkReviewed(item)}
                    >
                      Mark Reviewed
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {previewModal}
    </PageShell>
  )
}
