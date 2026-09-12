/**
 * Post-campaign organisational Dashboard body (presentation).
 * Status / attention / quick actions — not a campaign command centre.
 */

import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CampaignExtensionNotice } from '@/components/campaign/CampaignExtensionNotice'
import { AdminQuickActionsPanel } from '@/components/mission-control/AdminQuickActionsPanel'
import { WidgetErrorBoundary } from '@/components/mission-control/WidgetErrorBoundary'
import { ROUTES } from '@/constants/routes'
import { CardSkeleton } from '@/components/ui/Skeleton'
import type { QuickActionItem } from '@/lib/missionControl/adminCommandCenterWorkflow'
import {
  meqatiYearUrduRange,
  type MeqatiYearSelection,
} from '@/lib/dashboard/meqatiYear'
import {
  collectOngoingActivities,
  type MeqatiYearActivityStatus,
  type OrganisationalSituation,
  type ShobahDrillActivity,
  type ShobahStatusRow,
} from '@/lib/dashboard/organisationalSituation'
import { Icon } from '@/components/ui/Icon'
import { shobahVisualByCode } from '@/pages/admin/meqati/meqatiPlanningPresentation'

type OrganisationalDashboardStackProps = {
  situation: OrganisationalSituation
  quickActions: QuickActionItem[]
  metricsReady: boolean
  backgroundReady: boolean
}

type MeqatiPlanLinkProps = {
  planHref?: string
}

function EmptyMeqatiNote({ planHref = ROUTES.ADMIN_PLANNING }: MeqatiPlanLinkProps) {
  return (
    <div className="orgdash-empty">
      <p className="orgdash-empty-copy">میقاتی منصوبہ کا ڈیٹا ابھی درج نہیں کیا گیا</p>
      <Link to={planHref} className="orgdash-card-link">
        میقاتی منصوبہ دیکھیں
      </Link>
    </div>
  )
}

const STATUS_LABEL: Record<MeqatiYearActivityStatus, string> = {
  completed: 'مکمل',
  in_progress: 'جاری',
  remaining: 'باقی',
}

function yearStatusLabel(status: MeqatiYearActivityStatus | null): string {
  return status ? STATUS_LABEL[status] : 'غیر متعین'
}

function DrillActivityList({ activities }: { activities: readonly ShobahDrillActivity[] }) {
  if (activities.length === 0) {
    return <p className="orgdash-muted">سرگرمی نہیں۔</p>
  }
  return (
    <ul className="orgdash-drill-list">
      {activities.map((activity) => (
        <li key={activity.id}>
          <p className="orgdash-drill-activity">{activity.name}</p>
          <p className="orgdash-hint">
            صورتحال: {yearStatusLabel(activity.status)} · ذمہ دار:{' '}
            {activity.responsibleName ?? 'غیر متعین'} · نظام الاوقات:{' '}
            {activity.scheduleLabel}
            {activity.summary ? ` · خلاصہ: ${activity.summary}` : null}
          </p>
        </li>
      ))}
    </ul>
  )
}

function mansoobaStatusLabel(status: OrganisationalSituation['meqati']['mansooba']): string {
  if (!status) return ''
  if (status.status === 'active') return 'فعال'
  if (status.status === 'draft') return 'مسودہ'
  return status.status
}

function recordedYearStatuses(counts: OrganisationalSituation['meqati']['counts']): number {
  return counts.completed + counts.inProgress + counts.remaining
}

function progressDisplay(counts: OrganisationalSituation['meqati']['counts']): string {
  if (recordedYearStatuses(counts) === 0) return 'غیر متعین'
  return `${counts.progressPct}%`
}

function formatFreshness(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ur-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Karachi',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function IjtemaSnapshot({ situation }: { situation: OrganisationalSituation }) {
  const ijtema = situation.ijtema
  return (
    <section className="orgdash-open-section" aria-label="ہفتہ وار اجتماع" dir="rtl" lang="ur">
      <div className="orgdash-status-strip-head">
        <h2 className="orgdash-section-title">ہفتہ وار اجتماع</h2>
        <Link to={ROUTES.ADMIN_WEEKLY_IJTEMA} className="orgdash-card-link">
          تفصیل
        </Link>
      </div>
      {!ijtema.hasOpenEvent ? (
        <p className="orgdash-muted">اس وقت کوئی کھلا اجتماع نہیں۔</p>
      ) : (
        <div className="orgdash-ijtema">
          <div className="orgdash-ijtema-primary">
            <p className="orgdash-kicker">حاضری شرکاء</p>
            <p className="orgdash-ijtema-number">{ijtema.present}</p>
            <p className="orgdash-hint">
              اہل {ijtema.eligible} · شرکت {ijtema.attendancePct}%
            </p>
            <dl className="orgdash-ijtema-split">
              <div>
                <dt>مرد</dt>
                <dd>{ijtema.malePresent}</dd>
              </div>
              <div>
                <dt>خواتین</dt>
                <dd>{ijtema.femalePresent}</dd>
              </div>
            </dl>
          </div>
          <div className="orgdash-ijtema-report">
            <p className="orgdash-kicker">ارکان کی حاضری رپورٹ</p>
            <p className="orgdash-hint">شرکاء کی حاضری سے الگ میٹرک۔</p>
            <dl className="orgdash-stat-row orgdash-stat-row-3 orgdash-stat-row-quiet">
              <div>
                <dt>جمع</dt>
                <dd>{ijtema.ruknsSubmitted}</dd>
              </div>
              <div>
                <dt>کل ارکان</dt>
                <dd>{ijtema.ruknsTotal}</dd>
              </div>
              <div>
                <dt>باقی</dt>
                <dd>{ijtema.ruknsPending}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </section>
  )
}

export function MeqatiYearSummary({
  situation,
  yearSelection,
  planHref = ROUTES.ADMIN_PLANNING,
  attention = null,
}: {
  situation: OrganisationalSituation
  yearSelection?: MeqatiYearSelection
  planHref?: string
  /** When set, توجہ طلب is composed into the Meeqati panel (Admin Home). */
  attention?: ReactNode
}) {
  const { year, counts, empty, mansooba } = situation.meqati
  const composed = Boolean(attention)
  return (
    <section
      className={composed ? 'orgdash-meqati-compose' : 'orgdash-meqati-panel'}
      aria-label="میقاتی منصوبہ — موجودہ سال"
      dir="rtl"
      lang="ur"
    >
      <div className="orgdash-meqati-main">
        <div className="orgdash-meqati-panel-head">
          <div className="min-w-0">
            <h2 className="orgdash-meqati-panel-title">میقاتی منصوبہ — موجودہ سال</h2>
            <p className="orgdash-meqati-panel-sub">
              {mansooba ? (
                <>
                  {mansooba.name} · {mansoobaStatusLabel(mansooba)} ·{' '}
                </>
              ) : null}
              {year.label} · {meqatiYearUrduRange(year)}
            </p>
          </div>
          <Link to={planHref} className="orgdash-meqati-panel-link">
            میقاتی منصوبہ دیکھیں
          </Link>
        </div>
        {yearSelection ? (
          <label className="orgdash-year-field orgdash-year-field-inline">
            <span className="sr-only">میقاتی سال منتخب کریں</span>
            <select
              className="orgdash-year-select orgdash-meqati-year-select"
              value={yearSelection.year.key}
              onChange={(event) => yearSelection.setYearKey(event.target.value)}
              aria-label="میقاتی سال منتخب کریں"
            >
              {yearSelection.years.map((row) => (
                <option key={row.key} value={row.key}>
                  {row.label} · {meqatiYearUrduRange(row)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {!mansooba || empty ? (
          <EmptyMeqatiNote planHref={planHref} />
        ) : (
          <dl className="orgdash-stat-row orgdash-stat-row-5 orgdash-meqati-stats">
            <div>
              <dt>سرگرمیاں</dt>
              <dd>{counts.activities}</dd>
            </div>
            <div>
              <dt>مکمل</dt>
              <dd>{counts.completed}</dd>
            </div>
            <div>
              <dt>جاری</dt>
              <dd>{counts.inProgress}</dd>
            </div>
            <div>
              <dt>باقی</dt>
              <dd>{counts.remaining}</dd>
            </div>
            <div>
              <dt>پیش رفت</dt>
              <dd>{progressDisplay(counts)}</dd>
            </div>
          </dl>
        )}
      </div>
      {composed ? (
        <>
          <div className="orgdash-meqati-gold-divider" aria-hidden />
          <div className="orgdash-meqati-attention-slot">{attention}</div>
        </>
      ) : null}
    </section>
  )
}

export function ShobahStatusSection({
  rows,
  empty,
  planHref = ROUTES.ADMIN_PLANNING,
}: {
  rows: ShobahStatusRow[]
  empty: boolean
  planHref?: string
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <section className="orgdash-dept-panel" aria-label="میقاتی منصوبہ — شعبہ وار صورتحال" dir="rtl" lang="ur">
      <div className="orgdash-status-strip-head">
        <h2 className="orgdash-section-title">شعبہ جات</h2>
        <Link to={planHref} className="orgdash-card-link">
          میقاتی منصوبہ دیکھیں
        </Link>
      </div>
      {empty || rows.length === 0 ? (
        <EmptyMeqatiNote planHref={planHref} />
      ) : (
        <ul className="orgdash-dept-cards">
          {rows.map((row) => {
            const open = openId === row.shobahId
            const visual = shobahVisualByCode(row.shobahId)
            return (
              <li key={row.shobahId} className="orgdash-dept-card-wrap">
                <button
                  type="button"
                  className="orgdash-dept-card"
                  aria-expanded={open}
                  style={{
                    backgroundColor: visual.wash,
                    color: visual.ink,
                    borderColor: `color-mix(in srgb, ${visual.accent} 22%, var(--color-border))`,
                  }}
                  onClick={() =>
                    setOpenId((current) => (current === row.shobahId ? null : row.shobahId))
                  }
                >
                  <span className="orgdash-dept-card-top">
                    <span className="min-w-0">
                      <span className="orgdash-dept-name">{row.name}</span>
                      <span className="orgdash-dept-meta">
                        {row.completed}/{row.activities} مکمل · {progressDisplay(row)}
                      </span>
                    </span>
                    <span className="orgdash-dept-card-actions">
                      <span
                        className="orgdash-dept-card-icon"
                        style={{ color: visual.accent }}
                        aria-hidden
                      >
                        <Icon name={visual.icon} size="md" />
                      </span>
                      <span className="orgdash-dept-card-chevron" aria-hidden>
                        {open ? '›' : '‹'}
                      </span>
                    </span>
                  </span>
                </button>
                {open ? (
                  <div className="orgdash-dept-drill">
                    {row.objectives.length === 0 && row.unmappedActivities.length === 0 ? (
                      <p className="orgdash-muted">اس شعبہ میں اہداف نہیں۔</p>
                    ) : (
                      <>
                        {row.objectives.map((objective) => (
                          <div key={objective.id} className="orgdash-drill-objective">
                            <p className="orgdash-drill-title">{objective.title}</p>
                            <DrillActivityList activities={objective.activities} />
                          </div>
                        ))}
                        {row.unmappedActivities.length > 0 ? (
                          <div className="orgdash-drill-objective">
                            <p className="orgdash-drill-title">بغیر ہدف</p>
                            <DrillActivityList activities={row.unmappedActivities} />
                          </div>
                        ) : null}
                      </>
                    )}
                    <Link to={planHref} className="orgdash-card-link">
                      رپورٹ / میقاتی منصوبہ کھولیں
                    </Link>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function AttentionCompact({ situation }: { situation: OrganisationalSituation }) {
  const visible = situation.attention.categories.filter(
    (row) => row.count > 0 && row.id !== 'other',
  )
  return (
    <aside className="orgdash-attention-panel" aria-label="توجہ طلب" dir="rtl" lang="ur">
      <h2 className="orgdash-attention-title">توجہ طلب</h2>
      {visible.length === 0 ? (
        <p className="orgdash-muted">اس وقت کوئی توجہ طلب معاملہ نہیں۔</p>
      ) : (
        <ul className="orgdash-attention-list">
          {visible.map((row) => {
            const label =
              row.id === 'inbox'
                ? `${row.label} — ${row.count} items require your attention`
                : `${row.label}: ${row.count}`
            if (row.route) {
              return (
                <li key={row.id}>
                  <Link to={row.route} className="orgdash-attention-row" aria-label={label}>
                    <span className="orgdash-attention-label">{row.label}</span>
                    <span className="orgdash-attention-count">{row.count}</span>
                  </Link>
                </li>
              )
            }
            return (
              <li key={row.id} className="orgdash-attention-row">
                <span className="orgdash-attention-label">{row.label}</span>
                <span className="orgdash-attention-count">{row.count}</span>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}

function ImportantActivities({ situation }: { situation: OrganisationalSituation }) {
  const rows = collectOngoingActivities(situation.meqati.shobahs)
  return (
    <section className="orgdash-open-section" aria-label="اہم جاری سرگرمیاں" dir="rtl" lang="ur">
      <div className="orgdash-status-strip-head">
        <h2 className="orgdash-section-title">اہم جاری سرگرمیاں</h2>
        <Link to={ROUTES.ADMIN_PLANNING} className="orgdash-card-link">
          میقاتی منصوبہ دیکھیں
        </Link>
      </div>
      {situation.meqati.empty ? (
        <EmptyMeqatiNote />
      ) : rows.length === 0 ? (
        <p className="orgdash-muted">اس سال کی جاری یا باقی سرگرمیاں دستیاب نہیں۔</p>
      ) : (
        <ul className="orgdash-activity-list">
          {rows.map((row) => (
            <li key={row.id} className="orgdash-activity-row">
              <p className="orgdash-drill-activity">{row.name}</p>
              <p className="orgdash-hint">
                صورتحال: {yearStatusLabel(row.status)} · ذمہ دار:{' '}
                {row.responsibleName ?? 'غیر متعین'} · نظام الاوقات: {row.scheduleLabel}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ActiveCampaignCompact({ situation }: { situation: OrganisationalSituation }) {
  const campaign = situation.activeCampaign
  if (!campaign) return null

  return (
    <section className="orgdash-open-section" aria-label="فعال مہم" dir="rtl" lang="ur">
      <div className="orgdash-status-strip-head">
        <h2 className="orgdash-section-title">فعال مہم</h2>
        <Link to={campaign.route} className="orgdash-card-link">
          مہمات دیکھیں
        </Link>
      </div>
      <CampaignExtensionNotice />
      <p className="orgdash-campaign-name">{campaign.name}</p>
      <p className="orgdash-hint">{campaign.periodLabel}</p>
    </section>
  )
}

export function OrganisationalDashboardStack({
  situation,
  quickActions,
  metricsReady,
  backgroundReady,
}: OrganisationalDashboardStackProps) {
  return (
    <div className="orgdash-stack">
      <WidgetErrorBoundary title="میقاتی منصوبہ">
        {backgroundReady ? (
          <MeqatiYearSummary
            situation={situation}
            attention={<AttentionCompact situation={situation} />}
          />
        ) : (
          <CardSkeleton count={1} />
        )}
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="شعبہ وار صورتحال">
        {backgroundReady ? (
          <ShobahStatusSection rows={situation.meqati.shobahs} empty={situation.meqati.empty} />
        ) : (
          <CardSkeleton count={1} />
        )}
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="ہفتہ وار اجتماع">
        {backgroundReady ? <IjtemaSnapshot situation={situation} /> : <CardSkeleton count={1} />}
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="فوری اقدامات">
        <div className="orgdash-quick-wrap" dir="rtl" lang="ur">
          <AdminQuickActionsPanel actions={quickActions} />
        </div>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="اہم جاری سرگرمیاں">
        {backgroundReady ? (
          <ImportantActivities situation={situation} />
        ) : (
          <CardSkeleton count={1} />
        )}
      </WidgetErrorBoundary>

      {situation.activeCampaign ? (
        <WidgetErrorBoundary title="فعال مہم">
          {metricsReady ? (
            <ActiveCampaignCompact situation={situation} />
          ) : (
            <CardSkeleton count={1} />
          )}
        </WidgetErrorBoundary>
      ) : null}

      {metricsReady ? (
        <p className="orgdash-freshness" dir="rtl" lang="ur">
          آخری تازہ کاری: {formatFreshness(situation.generatedAt)}
          {situation.metricsLive ? <> · تمام ڈیٹا لائیو جمع شدہ معلومات پر مبنی ہے</> : null}
        </p>
      ) : null}
    </div>
  )
}
