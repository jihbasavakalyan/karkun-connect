import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { AdminLayout } from '@/layouts/AdminLayout'
import { RuknLayout } from '@/layouts/RuknLayout'
import { AssignmentManagementPage } from '@/pages/admin/AssignmentManagementPage'
import { AdminHomePage } from '@/pages/admin/AdminHomePage'
import { CampaignSetupPage } from '@/pages/admin/CampaignSetupPage'
import { CampaignsPage } from '@/pages/admin/CampaignsPage'
import { ExecutionModulePage } from '@/pages/admin/ExecutionModulePage'
import { FollowUpDevelopmentModulePage } from '@/pages/admin/FollowUpDevelopmentModulePage'
import { HelpPage } from '@/pages/admin/HelpPage'
import { KarkunanPage } from '@/pages/admin/KarkunanPage'
import { KarkunProfilePage } from '@/pages/admin/KarkunProfilePage'
import { ReviewReportsModulePage } from '@/pages/admin/ReviewReportsModulePage'
import { RuknDetailPage } from '@/pages/admin/RuknDetailPage'
import { RuknModulePage } from '@/pages/admin/RuknModulePage'
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { CampaignRecordPage } from '@/pages/rukn/CampaignRecordPage'
import { RuknHomePage } from '@/pages/rukn/RuknHomePage'
import { AvailableKarkunPage } from '@/pages/rukn/AvailableKarkunPage'
import { MyKarkunPage } from '@/pages/rukn/MyKarkunPage'
import { WorkerMeetingFormPage } from '@/pages/rukn/WorkerMeetingFormPage'
import { LandingPage } from '@/pages/shared/LandingPage'
import { GuestRoute, ProtectedRoute } from '@/routes/ProtectedRoute'

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">{title}</h2>
      <p className="mt-2 text-secondary">Coming in a future sprint.</p>
    </div>
  )
}

function LegacyKarkunProfileRedirect() {
  const { karkunId } = useParams<{ karkunId: string }>()
  return <Navigate to={`${ROUTES.ADMIN_KARKUN}/${karkunId ?? ''}`} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
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
          <Route path="execution" element={<ExecutionModulePage />} />
          <Route path="review" element={<ReviewReportsModulePage />} />
          <Route path="follow-up" element={<FollowUpDevelopmentModulePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />

          {/* Legacy route redirects */}
          <Route path="campaigns" element={<Navigate to={ROUTES.ADMIN_CAMPAIGN} replace />} />
          <Route path="assignments" element={<Navigate to={ROUTES.ADMIN_ASSIGNMENTS} replace />} />
          <Route path="reviews" element={<Navigate to={ROUTES.ADMIN_REVIEW} replace />} />
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
          <Route path="visit/:karkunId" element={<WorkerMeetingFormPage />} />
          <Route path="campaign-record" element={<CampaignRecordPage />} />
          <Route path="tasks" element={<PlaceholderPage title="Tasks" />} />
          <Route path="visits" element={<PlaceholderPage title="Visits" />} />
          <Route path="reports" element={<PlaceholderPage title="Reports" />} />
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
