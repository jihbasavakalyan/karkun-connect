import { Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { ScrollToTop } from '@/components/ux/ScrollToTop'
import { RoutePageFallback } from '@/components/ux/RoutePageFallback'
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
const ComplianceModulePage = lazyWithChunkReload(() =>
  import('@/pages/admin/ComplianceModulePage').then((m) => ({ default: m.ComplianceModulePage })),
)
const ExecutionModulePage = lazyWithChunkReload(() =>
  import('@/pages/admin/ExecutionModulePage').then((m) => ({ default: m.ExecutionModulePage })),
)
const FollowUpDevelopmentModulePage = lazyWithChunkReload(() =>
  import('@/pages/admin/FollowUpDevelopmentModulePage').then((m) => ({
    default: m.FollowUpDevelopmentModulePage,
  })),
)
const CommunicationModulePage = lazyWithChunkReload(() =>
  import('@/pages/admin/CommunicationModulePage').then((m) => ({
    default: m.CommunicationModulePage,
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
const KarkunProfilePage = lazyWithChunkReload(() =>
  import('@/pages/admin/KarkunProfilePage').then((m) => ({ default: m.KarkunProfilePage })),
)
const RuknDetailPage = lazyWithChunkReload(() =>
  import('@/pages/admin/RuknDetailPage').then((m) => ({ default: m.RuknDetailPage })),
)
const RuknModulePage = lazyWithChunkReload(() =>
  import('@/pages/admin/RuknModulePage').then((m) => ({ default: m.RuknModulePage })),
)
const SettingsPage = lazyWithChunkReload(() =>
  import('@/pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })),
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
const ConnectionJourneyPage = lazyWithChunkReload(() =>
  import('@/pages/rukn/ConnectionJourneyPage').then((m) => ({ default: m.ConnectionJourneyPage })),
)
const RuknSettingsPage = lazyWithChunkReload(() =>
  import('@/pages/rukn/RuknSettingsPage').then((m) => ({ default: m.RuknSettingsPage })),
)

function LegacyKarkunProfileRedirect() {
  const { karkunId } = useParams<{ karkunId: string }>()
  return <Navigate to={`${ROUTES.ADMIN_KARKUN}/${karkunId ?? ''}`} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
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
            <Route path="rukn" element={<RuknModulePage />} />
            <Route path="rukn/:ruknId" element={<RuknDetailPage />} />
            <Route path="karkun" element={<KarkunanPage />} />
            <Route path="karkun/:karkunId" element={<KarkunProfilePage />} />
            <Route path="assignments" element={<AssignmentManagementPage />} />
            <Route path="annexure-1/:karkunId" element={<ConnectionJourneyPage />} />
            <Route path="execution" element={<ExecutionModulePage />} />
            <Route path="compliance" element={<ComplianceModulePage />} />
            <Route
              path="review"
              element={<Navigate to={`${ROUTES.ADMIN_EXECUTION}?section=reports`} replace />}
            />
            <Route path="follow-up" element={<FollowUpDevelopmentModulePage />} />
            <Route path="communication" element={<CommunicationModulePage />} />
            <Route path="lists" element={<CampaignListsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="debug/runtime" element={<RuntimeDiagnosticsPage />} />

            {/* Legacy route redirects */}
            <Route path="campaigns" element={<Navigate to={ROUTES.ADMIN_CAMPAIGN} replace />} />
            <Route
              path="reviews"
              element={<Navigate to={`${ROUTES.ADMIN_EXECUTION}?section=reports`} replace />}
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
            <Route path="visit/:karkunId" element={<ConnectionJourneyPage />} />
            <Route path="campaign-record" element={<CampaignRecordPage />} />
            <Route path="settings" element={<RuknSettingsPage />} />
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
