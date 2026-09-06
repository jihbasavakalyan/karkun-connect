import { Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { ROUTES, adminOperationsPath } from '@/constants/routes'
import { ScrollToTop } from '@/components/ux/ScrollToTop'
import { RoutePageFallback } from '@/components/ux/RoutePageFallback'
import { PwaRuntimeChrome } from '@/components/pwa/PwaRuntimeChrome'
import { AdminLayout } from '@/layouts/AdminLayout'
import { RuknLayout } from '@/layouts/RuknLayout'
import { lazyWithChunkReload } from '@/lib/lazyWithChunkReload'
import { LoginPage } from '@/pages/auth/LoginPage'
import { LandingPage } from '@/pages/shared/LandingPage'
import { GuestRoute, ProtectedRoute } from '@/routes/ProtectedRoute'

// KC-0078 — Route-level code splitting; keep login/landing eager for first paint.
const AdminHomePage = lazyWithChunkReload(() =>
  import('@/pages/admin/AdminHomePage').then((m) => ({ default: m.AdminHomePage })),
)
const CampaignSetupPage = lazyWithChunkReload(() =>
  import('@/pages/admin/CampaignSetupPage').then((m) => ({ default: m.CampaignSetupPage })),
)
const CampaignsPage = lazyWithChunkReload(() =>
  import('@/pages/admin/CampaignsPage').then((m) => ({ default: m.CampaignsPage })),
)
const AdminReportCenterPage = lazyWithChunkReload(() =>
  import('@/pages/admin/AdminReportCenterPage').then((m) => ({
    default: m.AdminReportCenterPage,
  })),
)
const OperationsPage = lazyWithChunkReload(() =>
  import('@/pages/admin/OperationsPage').then((m) => ({ default: m.OperationsPage })),
)
const ActivitiesHubPage = lazyWithChunkReload(() =>
  import('@/pages/admin/ActivitiesHubPage').then((m) => ({ default: m.ActivitiesHubPage })),
)
const AdminWeeklyIjtemaPage = lazyWithChunkReload(() =>
  import('@/pages/admin/AdminWeeklyIjtemaPage').then((m) => ({ default: m.AdminWeeklyIjtemaPage })),
)
const AdminWeeklyIjtemaReportPage = lazyWithChunkReload(() =>
  import('@/pages/admin/AdminWeeklyIjtemaReportPage').then((m) => ({
    default: m.AdminWeeklyIjtemaReportPage,
  })),
)
const AdminMonthlyBaitulMaalPage = lazyWithChunkReload(() =>
  import('@/pages/admin/AdminMonthlyBaitulMaalPage').then((m) => ({
    default: m.AdminMonthlyBaitulMaalPage,
  })),
)
const AdminMonthlyBaitulMaalReportPage = lazyWithChunkReload(() =>
  import('@/pages/admin/AdminMonthlyBaitulMaalReportPage').then((m) => ({
    default: m.AdminMonthlyBaitulMaalReportPage,
  })),
)
const CommunicationModulePage = lazyWithChunkReload(() =>
  import('@/pages/admin/CommunicationModulePage').then((m) => ({
    default: m.CommunicationModulePage,
  })),
)
const ContextAwareCommunicationHistoryPage = lazyWithChunkReload(() =>
  import('@/pages/admin/ContextAwareCommunicationHistoryPage').then((m) => ({
    default: m.ContextAwareCommunicationHistoryPage,
  })),
)
const MissionWorkspacePage = lazyWithChunkReload(() =>
  import('@/pages/admin/MissionWorkspacePage').then((m) => ({
    default: m.MissionWorkspacePage,
  })),
)
const CampaignListsPage = lazyWithChunkReload(() =>
  import('@/pages/admin/CampaignListsPage').then((m) => ({ default: m.CampaignListsPage })),
)
const HelpPage = lazyWithChunkReload(() =>
  import('@/pages/admin/HelpPage').then((m) => ({ default: m.HelpPage })),
)
const KarkunanPage = lazyWithChunkReload(() =>
  import('@/pages/admin/KarkunanPage').then((m) => ({ default: m.KarkunanPage })),
)
const MuttafiqeenPage = lazyWithChunkReload(() =>
  import('@/pages/admin/MuttafiqeenPage').then((m) => ({ default: m.MuttafiqeenPage })),
)
const AdminInboxPage = lazyWithChunkReload(() =>
  import('@/pages/admin/AdminInboxPage').then((m) => ({ default: m.AdminInboxPage })),
)
const KarkunProfilePage = lazyWithChunkReload(() =>
  import('@/pages/admin/KarkunProfilePage').then((m) => ({ default: m.KarkunProfilePage })),
)
const RuknDetailPage = lazyWithChunkReload(() =>
  import('@/pages/admin/RuknDetailPage').then((m) => ({ default: m.RuknDetailPage })),
)
const RuknModulePage = lazyWithChunkReload(() =>
  import('@/pages/admin/RuknModulePage').then((m) => ({ default: m.RuknModulePage })),
)
const ARuknRegistryPage = lazyWithChunkReload(() =>
  import('@/pages/admin/ARuknRegistryPage').then((m) => ({ default: m.ARuknRegistryPage })),
)
const SettingsPage = lazyWithChunkReload(() =>
  import('@/pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const AdminPlanningPage = lazyWithChunkReload(() =>
  import('@/pages/admin/AdminPlanningPage').then((m) => ({ default: m.AdminPlanningPage })),
)
const RuntimeDiagnosticsPage = lazyWithChunkReload(() =>
  import('@/pages/admin/RuntimeDiagnosticsPage').then((m) => ({
    default: m.RuntimeDiagnosticsPage,
  })),
)
const AssignmentManagementPage = lazyWithChunkReload(() =>
  import('@/pages/admin/AssignmentManagementPage').then((m) => ({
    default: m.AssignmentManagementPage,
  })),
)
const CampaignRecordPage = lazyWithChunkReload(() =>
  import('@/pages/rukn/CampaignRecordPage').then((m) => ({ default: m.CampaignRecordPage })),
)
const RuknHomePage = lazyWithChunkReload(() =>
  import('@/pages/rukn/RuknHomePage').then((m) => ({ default: m.RuknHomePage })),
)
const AvailableKarkunPage = lazyWithChunkReload(() =>
  import('@/pages/rukn/AvailableKarkunPage').then((m) => ({ default: m.AvailableKarkunPage })),
)
const MyKarkunPage = lazyWithChunkReload(() =>
  import('@/pages/rukn/MyKarkunPage').then((m) => ({ default: m.MyKarkunPage })),
)
const RuknCommunicationPage = lazyWithChunkReload(() =>
  import('@/pages/rukn/RuknCommunicationPage').then((m) => ({ default: m.RuknCommunicationPage })),
)
const CompanionWorkspacePage = lazyWithChunkReload(() =>
  import('@/pages/rukn/CompanionWorkspacePage').then((m) => ({
    default: m.CompanionWorkspacePage,
  })),
)
const ConnectionJourneyPage = lazyWithChunkReload(() =>
  import('@/pages/rukn/ConnectionJourneyPage').then((m) => ({ default: m.ConnectionJourneyPage })),
)
const RuknSettingsPage = lazyWithChunkReload(() =>
  import('@/pages/rukn/RuknSettingsPage').then((m) => ({ default: m.RuknSettingsPage })),
)
const WeeklyIjtemaRegisterPage = lazyWithChunkReload(() =>
  import('@/pages/rukn/WeeklyIjtemaRegisterPage').then((m) => ({
    default: m.WeeklyIjtemaRegisterPage,
  })),
)
const RuknMonthlyBaitulMaalPage = lazyWithChunkReload(() =>
  import('@/pages/rukn/RuknMonthlyBaitulMaalPage').then((m) => ({
    default: m.RuknMonthlyBaitulMaalPage,
  })),
)
const TarbiyatiIjtemaRegistrationProgressPage = lazyWithChunkReload(() =>
  import('@/pages/rukn/TarbiyatiIjtemaRegistrationProgressPage').then((m) => ({
    default: m.TarbiyatiIjtemaRegistrationProgressPage,
  })),
)

function LegacyKarkunProfileRedirect() {
  const { karkunId } = useParams<{ karkunId: string }>()
  return <Navigate to={`${ROUTES.ADMIN_KARKUN}/${karkunId ?? ''}`} replace />
}

/** KC-0113.1 — Preserve query params when redirecting legacy module URLs into Operations tabs. */
function LegacyOperationsTabRedirect({ tab }: { tab: 'queue' | 'execute' | 'review' }) {
  const [searchParams] = useSearchParams()
  const next = new URLSearchParams(searchParams)
  next.set('tab', tab)
  return <Navigate to={`${ROUTES.ADMIN_OPERATIONS}?${next.toString()}`} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <PwaRuntimeChrome />
      <Suspense fallback={<RoutePageFallback />}>
        <Routes>
          <Route path={ROUTES.HOME} element={<LandingPage />} />
          <Route
            path={ROUTES.LOGIN}
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN}
            element={
              <ProtectedRoute allowedRole="administrator">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminHomePage />} />
            <Route path="campaign" element={<CampaignsPage />} />
            <Route path="campaign/setup" element={<CampaignSetupPage />} />
            <Route path="reports" element={<AdminReportCenterPage />} />
            <Route path="rukn" element={<RuknModulePage />} />
            <Route path="rukn/:ruknId" element={<RuknDetailPage />} />
            <Route path="a-rukn" element={<ARuknRegistryPage />} />
            <Route path="a-rukn/:ruknId" element={<RuknDetailPage />} />
            <Route path="karkun" element={<KarkunanPage />} />
            <Route path="karkun/:karkunId" element={<KarkunProfilePage />} />
            <Route path="muttafiqeen" element={<MuttafiqeenPage />} />
            <Route path="inbox" element={<AdminInboxPage />} />
            <Route path="assignments" element={<AssignmentManagementPage />} />
            <Route path="annexure-1/:karkunId" element={<ConnectionJourneyPage />} />
            <Route path="activities" element={<ActivitiesHubPage />} />
            <Route path="operations" element={<OperationsPage />} />
            {/* KC-0113.1 / KC-0115 — Legacy module routes redirect into Activities tabs */}
            <Route path="execution" element={<LegacyOperationsTabRedirect tab="execute" />} />
            <Route path="compliance" element={<LegacyOperationsTabRedirect tab="review" />} />
            <Route path="follow-up" element={<LegacyOperationsTabRedirect tab="queue" />} />
            <Route path="weekly-ijtema" element={<AdminWeeklyIjtemaPage />} />
            <Route path="weekly-ijtema/:eventId/report" element={<AdminWeeklyIjtemaReportPage />} />
            <Route path="baitul-maal" element={<AdminMonthlyBaitulMaalPage />} />
            <Route
              path="baitul-maal/:cycleId/report"
              element={<AdminMonthlyBaitulMaalReportPage />}
            />
            <Route
              path="review"
              element={
                <Navigate
                  to={adminOperationsPath('execute', { section: 'reports' })}
                  replace
                />
              }
            />
            <Route path="communication" element={<CommunicationModulePage />} />
            <Route
              path="communication-history"
              element={<ContextAwareCommunicationHistoryPage />}
            />
            <Route path="mission-workspace" element={<MissionWorkspacePage />} />
            <Route path="lists" element={<CampaignListsPage />} />
            <Route path="planning" element={<AdminPlanningPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="debug/runtime" element={<RuntimeDiagnosticsPage />} />

            {/* Legacy route redirects */}
            <Route path="campaigns" element={<Navigate to={ROUTES.ADMIN_CAMPAIGN} replace />} />
            <Route
              path="reviews"
              element={
                <Navigate
                  to={adminOperationsPath('execute', { section: 'reports' })}
                  replace
                />
              }
            />
            <Route path="karkunan" element={<Navigate to={ROUTES.ADMIN_KARKUN} replace />} />
            <Route path="karkunan/:karkunId" element={<LegacyKarkunProfileRedirect />} />
            <Route path="rukn-master" element={<Navigate to={ROUTES.ADMIN_RUKN} replace />} />
          </Route>

          <Route
            path={ROUTES.RUKN}
            element={
              <ProtectedRoute allowedRole="rukn">
                <RuknLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RuknHomePage />} />
            <Route path="available-karkun" element={<AvailableKarkunPage />} />
            <Route path="my-karkun" element={<MyKarkunPage />} />
            <Route path="communication" element={<RuknCommunicationPage />} />
            <Route path="communication/companion/:karkunId" element={<CompanionWorkspacePage />} />
            <Route path="visit/:karkunId" element={<ConnectionJourneyPage />} />
            <Route path="campaign-record" element={<CampaignRecordPage />} />
            <Route path="weekly-ijtema" element={<WeeklyIjtemaRegisterPage />} />
            <Route path="baitul-maal" element={<RuknMonthlyBaitulMaalPage />} />
            <Route path="tarbiyati-ijtema" element={<TarbiyatiIjtemaRegistrationProgressPage />} />
            <Route path="settings" element={<RuknSettingsPage />} />
            {/* KC-037 V1 — no Rukn Report Center; legacy /rukn/reports → Campaign Record */}
            <Route path="reports" element={<Navigate to={ROUTES.RUKN_CAMPAIGN_RECORD} replace />} />
            <Route path="tasks" element={<Navigate to={ROUTES.RUKN} replace />} />
            <Route path="visits" element={<Navigate to={ROUTES.RUKN_MY_KARKUN} replace />} />
          </Route>

          <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
