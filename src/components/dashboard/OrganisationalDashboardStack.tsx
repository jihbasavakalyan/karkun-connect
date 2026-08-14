/**
 * Post-campaign organisational Dashboard body (presentation).
 * Status / attention / quick actions / reports — not a reminder board.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CampaignExtensionNotice } from '@/components/campaign/CampaignExtensionNotice'
import { AdminQuickActionsPanel } from '@/components/mission-control/AdminQuickActionsPanel'
import { ActivityTimeline } from '@/components/mission-control/ActivityTimeline'
import { CampaignHealthPanel } from '@/components/mission-control/CampaignHealthPanel'
import { ProgressTrendsPanel } from '@/components/mission-control/ProgressTrendsPanel'
import { WidgetErrorBoundary } from '@/components/mission-control/WidgetErrorBoundary'
import { Icon } from '@/components/ui/Icon'
import { ROUTES } from '@/constants/routes'
import type { QuickActionItem } from '@/lib/missionControl/adminCommandCenterWorkflow'
import type {
  MeqatiYearActivityStatus,
  OrganisationalSituation,
  ShobahStatusRow,
} from '@/lib/dashboard/organisationalSituation'

type OrganisationalDashboardStackProps = {
  situation: OrganisationalSituation
  quickActions: QuickActionItem[]
  campaignHealth: Parameters<typeof CampaignHealthPanel>[0]['metrics']
  trends: Parameters<typeof ProgressTrendsPanel>[0]['trends']
  metricsReady: boolean
  backgroundReady: boolean
}

const STATUS_LABEL: Record<MeqatiYearActivityStatus, string> = {
  completed: 'مکمل',
  in_progress: 'جاری',
  remaining: 'باقی',
}

function yearStatusLabel(status: MeqatiYearActivityStatus | null): string {
  return status ? STATUS_LABEL[status] : 'غیر متعین'
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
        <div className="orgdash-ijtema-grid">
          <div className="orgdash-ijtema-block">
            <p className="orgdash-kicker">حاضری شرکاء</p>
            <dl className="orgdash-stat-row">
              <div>
                <dt>حاضر</dt>
                <dd>{ijtema.present}</dd>
              </div>
              <div>
                <dt>اہل</dt>
                <dd>{ijtema.eligible}</dd>
              </div>
              <div>
                <dt>شرکت %</dt>
                <dd>{ijtema.attendancePct}%</dd>
              </div>
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
          <div className="orgdash-ijtema-block">
            <p className="orgdash-kicker">ارکان کی حاضری رپورٹ</p>
            <p className="orgdash-hint">شرکاء کی حاضری سے الگ میٹرک۔</p>
            <dl className="orgdash-stat-row">
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

function MeqatiYearSummary({ situation }: { situation: OrganisationalSituation }) {
  const { year, counts, empty, mansooba } = situation.meqati
  return (
    <section className="orgdash-card" aria-label="میقاتی منصوبہ — موجودہ سال" dir="rtl" lang="ur">
      <div className="orgdash-card-head">
        <h2 className="orgdash-card-title">
          <span className="orgdash-card-icon orgdash-card-icon-teal" aria-hidden="true">
            <Icon name="flag" size="sm" />
          </span>
          میقاتی منصوبہ — موجودہ سال
        </h2>
        <span className="orgdash-card-meta">
          {year.label}
          <span className="orgdash-card-meta-sub"> ({year.rangeLabel})</span>
        </span>
      </div>
      {!mansooba || empty ? (
        <p className="orgdash-muted">
          اس سال کے لیے میقاتی سرگرمیاں ابھی درج نہیں۔ خالی حالت درست ہے — کوئی تخمینی اعداد نہیں۔
        </p>
      ) : (
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
            <dd>{counts.progressPct}%</dd>
          </div>
        </dl>
      )}
      {counts.activities > 0 ? (
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
      ) : null}
    </section>
  )
}

function ShobahStatusSection({ rows, empty }: { rows: ShobahStatusRow[]; empty: boolean }) {
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
        <Link to={ROUTES.ADMIN_PLANNING} className="orgdash-card-link">
          منصوبہ بندی
        </Link>
      </div>
      {empty || rows.length === 0 ? (
        <p className="orgdash-muted">شعبہ وار سرگرمیاں دستیاب نہیں۔</p>
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
                        {row.name}
                      </button>
                    </td>
                    <td>{row.activities}</td>
                    <td>{row.completed}</td>
                    <td>{row.inProgress}</td>
                    <td>{row.remaining}</td>
                    <td>{row.progressPct}%</td>
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
                    {row.completed}/{row.activities} مکمل · {row.progressPct}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {rows
            .filter((row) => row.shobahId === openId)
            .map((row) => (
              <div key={`drill-${row.shobahId}`} className="orgdash-drill">
                {row.objectives.length === 0 ? (
                  <p className="orgdash-muted">اس شعبہ میں اہداف نہیں۔</p>
                ) : (
                  row.objectives.map((objective) => (
                    <div key={objective.id} className="orgdash-drill-objective">
                      <p className="orgdash-drill-title">{objective.title}</p>
                      {objective.activities.length === 0 ? (
                        <p className="orgdash-muted">سرگرمی نہیں۔</p>
                      ) : (
                        <ul className="orgdash-drill-list">
                          {objective.activities.map((activity) => (
                            <li key={activity.id}>
                              <p className="orgdash-drill-activity">{activity.name}</p>
                              <p className="orgdash-hint">
                                {yearStatusLabel(activity.status)} · ذمہ دار:{' '}
                                {activity.responsibleName ?? 'غیر متعین'} · نظام الاوقات:{' '}
                                {activity.scheduleLabel}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                )}
                <Link to={ROUTES.ADMIN_PLANNING} className="orgdash-card-link">
                  رپورٹ / منصوبہ کھولیں
                </Link>
              </div>
            ))}
        </>
      )}
    </section>
  )
}

function AttentionCompact({ situation }: { situation: OrganisationalSituation }) {
  return (
    <section className="orgdash-card" aria-label="توجہ طلب" dir="rtl" lang="ur">
      <div className="orgdash-card-head">
        <h2 className="orgdash-card-title">
          <span className="orgdash-card-icon orgdash-card-icon-amber" aria-hidden="true">
            <Icon name="warning" size="sm" />
          </span>
          توجہ طلب
        </h2>
        <Link to={situation.attention.detailRoute} className="orgdash-card-link">
          تفصیل دیکھیں
        </Link>
      </div>
      {situation.attention.total === 0 ? (
        <p className="orgdash-muted">اس وقت کوئی توجہ طلب معاملہ نہیں۔</p>
      ) : (
        <ul className="orgdash-attention-grid">
          {situation.attention.categories.map((row) => (
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
  return (
    <section className="orgdash-card" aria-label="اہم سرگرمیوں کی صورتحال" dir="rtl" lang="ur">
      <div className="orgdash-card-head">
        <h2 className="orgdash-card-title">
          <span className="orgdash-card-icon orgdash-card-icon-blue" aria-hidden="true">
            <Icon name="pulse-healthy" size="sm" />
          </span>
          اہم سرگرمیوں کی صورتحال
        </h2>
      </div>
      <ul className="orgdash-important-grid">
        {situation.importantActivities.map((row) => (
          <li key={row.id}>
            <Link to={row.route} className="orgdash-important-card">
              <p className="orgdash-metric-label">{row.label}</p>
              <p className="orgdash-metric-value">{row.value}</p>
              {row.hint ? <p className="orgdash-hint">{row.hint}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ActiveCampaignCompact({ situation }: { situation: OrganisationalSituation }) {
  const campaign = situation.activeCampaign
  if (!campaign) {
    return (
      <section className="orgdash-card orgdash-card-quiet" aria-label="فعال مہم" dir="rtl" lang="ur">
        <h2 className="orgdash-card-title">فعال مہم</h2>
        <p className="orgdash-muted">اس وقت کوئی فعال مہم نہیں۔ مہم لائبریری دستیاب ہے۔</p>
        <Link to={ROUTES.ADMIN_CAMPAIGN} className="orgdash-card-link">
          مہم لائبریری
        </Link>
      </section>
    )
  }

  return (
    <section className="orgdash-card" aria-label="فعال مہم" dir="rtl" lang="ur">
      <div className="orgdash-card-head">
        <h2 className="orgdash-card-title">
          <span className="orgdash-card-icon orgdash-card-icon-teal" aria-hidden="true">
            <Icon name="megaphone" size="sm" />
          </span>
          فعال مہم
        </h2>
        <Link to={campaign.route} className="orgdash-card-link">
          مہم کھولیں
        </Link>
      </div>
      <CampaignExtensionNotice />
      <p className="orgdash-campaign-name">{campaign.name}</p>
      <p className="orgdash-hint">{campaign.periodLabel}</p>
      <p className="orgdash-metric-value">{campaign.progressPct}%</p>
      {campaign.focusedLabels.length > 0 ? (
        <ul className="orgdash-focus-list">
          {campaign.focusedLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export function OrganisationalDashboardStack({
  situation,
  quickActions,
  campaignHealth,
  trends,
  metricsReady,
  backgroundReady,
}: OrganisationalDashboardStackProps) {
  return (
    <div className="orgdash-stack">
      <WidgetErrorBoundary title="ہفتہ وار اجتماع">
        <IjtemaSnapshot situation={situation} />
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="میقاتی منصوبہ">
        <MeqatiYearSummary situation={situation} />
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="شعبہ وار صورتحال">
        <ShobahStatusSection rows={situation.meqati.shobahs} empty={situation.meqati.empty} />
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="توجہ طلب">
        <AttentionCompact situation={situation} />
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="فوری اقدامات">
        <div className="orgdash-quick-wrap" dir="rtl" lang="ur">
          <AdminQuickActionsPanel actions={quickActions} />
        </div>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="اہم سرگرمیاں">
        <ImportantActivities situation={situation} />
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="فعال مہم">
        <ActiveCampaignCompact situation={situation} />
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="Campaign Health">
        <CampaignHealthPanel
          metrics={campaignHealth}
          metricsReady={metricsReady}
          backgroundReady={backgroundReady}
        />
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="Progress Trends">
        <ProgressTrendsPanel trends={trends} ready={backgroundReady} />
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="Activity Timeline">
        <ActivityTimeline ready={backgroundReady} limit={12} />
      </WidgetErrorBoundary>

      <p className="orgdash-freshness" dir="rtl" lang="ur">
        آخری تازہ کاری: {formatFreshness(situation.generatedAt)}
        {situation.metricsLive ? (
          <>
            {' '}
            · تمام ڈیٹا لائیو جمع شدہ معلومات پر مبنی ہے
          </>
        ) : null}
      </p>
    </div>
  )
}
