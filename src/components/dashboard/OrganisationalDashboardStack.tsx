/**
 * Post-campaign organisational Dashboard body (presentation).
 * Status / attention / quick actions — not a campaign command centre.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CampaignExtensionNotice } from '@/components/campaign/CampaignExtensionNotice'
import { AdminQuickActionsPanel } from '@/components/mission-control/AdminQuickActionsPanel'
import { WidgetErrorBoundary } from '@/components/mission-control/WidgetErrorBoundary'
import { Icon } from '@/components/ui/Icon'
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
    <section className="orgdash-card" aria-label="ہفتہ وار اجتماع" dir="rtl" lang="ur">
      <div className="orgdash-card-head">
        <h2 className="orgdash-card-title">
          <span className="orgdash-card-icon orgdash-card-icon-blue" aria-hidden="true">
            <Icon name="calendar" size="sm" />
          </span>
          ہفتہ وار اجتماع
        </h2>
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
            <dl className="orgdash-stat-row orgdash-stat-row-3">
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
}: {
  situation: OrganisationalSituation
  yearSelection?: MeqatiYearSelection
  planHref?: string
}) {
  const { year, counts, empty, mansooba } = situation.meqati
  return (
    <section className="orgdash-card orgdash-card-foundation" aria-label="میقاتی منصوبہ — موجودہ سال" dir="rtl" lang="ur">
      <div className="orgdash-card-head">
        <h2 className="orgdash-card-title">
          <span className="orgdash-card-icon orgdash-card-icon-teal" aria-hidden="true">
            <Icon name="flag" size="sm" />
          </span>
          میقاتی منصوبہ — موجودہ سال
        </h2>
        <div className="orgdash-card-meta">
          {mansooba ? (
            <span className="orgdash-card-meta-year">
              {mansooba.name} · {mansoobaStatusLabel(mansooba)}
            </span>
          ) : null}
          <span className="orgdash-card-meta-sub">
            {year.label} · {meqatiYearUrduRange(year)}
          </span>
        </div>
      </div>
      {yearSelection ? (
        <label className="orgdash-year-field">
          <span className="sr-only">میقاتی سال منتخب کریں</span>
          <select
            className="orgdash-year-select"
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
        <>
          <dl className="orgdash-stat-row orgdash-stat-row-5">
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
          {recordedYearStatuses(counts) > 0 ? (
            <div className="orgdash-progress">
              <div
                className="orgdash-bar"
                role="progressbar"
                aria-valuenow={counts.progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`میقاتی پیش رفت ${counts.progressPct}%`}
              >
                <div className="orgdash-bar-fill" style={{ width: `${counts.progressPct}%` }} />
              </div>
              <p className="orgdash-progress-caption">{counts.progressPct}% مکمل</p>
            </div>
          ) : null}
        </>
      )}
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
    <section className="orgdash-card" aria-label="میقاتی منصوبہ — شعبہ وار صورتحال" dir="rtl" lang="ur">
      <div className="orgdash-card-head">
        <h2 className="orgdash-card-title">
          <span className="orgdash-card-icon orgdash-card-icon-teal" aria-hidden="true">
            <Icon name="clipboard" size="sm" />
          </span>
          میقاتی منصوبہ — شعبہ وار صورتحال
        </h2>
        <Link to={planHref} className="orgdash-card-link">
          میقاتی منصوبہ دیکھیں
        </Link>
      </div>
      {empty || rows.length === 0 ? (
        <EmptyMeqatiNote planHref={planHref} />
      ) : (
        <>
          <div className="orgdash-table-wrap">
            <table className="orgdash-table">
              <thead>
                <tr>
                  <th>شعبہ</th>
                  <th>سرگرمیاں</th>
                  <th>مکمل</th>
                  <th>جاری</th>
                  <th>باقی</th>
                  <th>پیش رفت</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.shobahId}>
                    <td>
                      <button
                        type="button"
                        className="orgdash-row-btn"
                        aria-expanded={openId === row.shobahId}
                        onClick={() =>
                          setOpenId((current) => (current === row.shobahId ? null : row.shobahId))
                        }
                      >
                        <span>{row.name}</span>
                        <span className="orgdash-row-btn-hint">
                          {openId === row.shobahId ? 'تفصیل بند کریں' : 'تفصیل کھولیں'}
                        </span>
                      </button>
                    </td>
                    <td>{row.activities}</td>
                    <td>{row.completed}</td>
                    <td>{row.inProgress}</td>
                    <td>{row.remaining}</td>
                    <td>{progressDisplay(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="orgdash-shobah-cards">
            {rows.map((row) => (
              <li key={`card-${row.shobahId}`}>
                <button
                  type="button"
                  className="orgdash-shobah-card"
                  aria-expanded={openId === row.shobahId}
                  onClick={() =>
                    setOpenId((current) => (current === row.shobahId ? null : row.shobahId))
                  }
                >
                  <span className="orgdash-shobah-name">{row.name}</span>
                  <span className="orgdash-shobah-meta">
                    {row.completed}/{row.activities} مکمل · {progressDisplay(row)} ·{' '}
                    {openId === row.shobahId ? 'تفصیل بند کریں' : 'تفصیل کھولیں'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {rows
            .filter((row) => row.shobahId === openId)
            .map((row) => (
              <div key={`drill-${row.shobahId}`} className="orgdash-drill">
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
            ))}
        </>
      )}
    </section>
  )
}

function AttentionCompact({ situation }: { situation: OrganisationalSituation }) {
  const visible = situation.attention.categories.filter(
    (row) => row.count > 0 && row.id !== 'other',
  )
  return (
    <section className="orgdash-card orgdash-card-quiet" aria-label="توجہ طلب" dir="rtl" lang="ur">
      <div className="orgdash-card-head">
        <h2 className="orgdash-card-title">
          <span className="orgdash-card-icon orgdash-card-icon-amber" aria-hidden="true">
            <Icon name="warning" size="sm" />
          </span>
          توجہ طلب
        </h2>
      </div>
      {visible.length === 0 ? (
        <p className="orgdash-muted">اس وقت کوئی توجہ طلب معاملہ نہیں۔</p>
      ) : (
        <ul className="orgdash-attention-grid">
          {visible.map((row) => (
            <li key={row.id} className="orgdash-attention-chip">
              <span className="orgdash-attention-count">{row.count}</span>
              <span className="orgdash-attention-label">{row.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ImportantActivities({ situation }: { situation: OrganisationalSituation }) {
  const rows = collectOngoingActivities(situation.meqati.shobahs)
  return (
    <section className="orgdash-card" aria-label="اہم جاری سرگرمیاں" dir="rtl" lang="ur">
      <div className="orgdash-card-head">
        <h2 className="orgdash-card-title">
          <span className="orgdash-card-icon orgdash-card-icon-teal" aria-hidden="true">
            <Icon name="clipboard" size="sm" />
          </span>
          اہم جاری سرگرمیاں
        </h2>
        <Link to={ROUTES.ADMIN_PLANNING} className="orgdash-card-link">
          میقاتی منصوبہ دیکھیں
        </Link>
      </div>
      {situation.meqati.empty ? (
        <EmptyMeqatiNote />
      ) : rows.length === 0 ? (
        <p className="orgdash-muted">اس سال کی جاری یا باقی سرگرمیاں دستیاب نہیں۔</p>
      ) : (
        <>
          <div className="orgdash-table-wrap">
            <table className="orgdash-table">
              <thead>
                <tr>
                  <th>سرگرمی</th>
                  <th>ذمہ دار</th>
                  <th>نظام الاوقات</th>
                  <th>صورتحال</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.responsibleName ?? 'غیر متعین'}</td>
                    <td>{row.scheduleLabel}</td>
                    <td>{yearStatusLabel(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="orgdash-activity-cards">
            {rows.map((row) => (
              <li key={`m-${row.id}`} className="orgdash-activity-card">
                <p className="orgdash-drill-activity">{row.name}</p>
                <p className="orgdash-hint">
                  صورتحال: {yearStatusLabel(row.status)} · ذمہ دار:{' '}
                  {row.responsibleName ?? 'غیر متعین'} · نظام الاوقات: {row.scheduleLabel}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function ActiveCampaignCompact({ situation }: { situation: OrganisationalSituation }) {
  const campaign = situation.activeCampaign
  if (!campaign) return null

  return (
    <section className="orgdash-card orgdash-card-quiet" aria-label="فعال مہم" dir="rtl" lang="ur">
      <div className="orgdash-card-head">
        <h2 className="orgdash-card-title">فعال مہم</h2>
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
          <MeqatiYearSummary situation={situation} />
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

      <WidgetErrorBoundary title="توجہ طلب">
        {backgroundReady ? <AttentionCompact situation={situation} /> : <CardSkeleton count={1} />}
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
