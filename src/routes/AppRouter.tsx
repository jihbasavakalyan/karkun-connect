import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { AdminLayout } from '@/layouts/AdminLayout'
import { RuknLayout } from '@/layouts/RuknLayout'
import { AdminHomePage } from '@/pages/admin/AdminHomePage'
import { CampaignSetupPage } from '@/pages/admin/CampaignSetupPage'
import { CampaignsPage } from '@/pages/admin/CampaignsPage'
import { KarkunanPage } from '@/pages/admin/KarkunanPage'
import { KarkunProfilePage } from '@/pages/admin/KarkunProfilePage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { CampaignRecordPage } from '@/pages/rukn/CampaignRecordPage'
import { RuknHomePage } from '@/pages/rukn/RuknHomePage'
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
          <Route path="assignments" element={<PlaceholderPage title="Assignments" />} />
          <Route path="reviews" element={<PlaceholderPage title="Reviews" />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="campaign/setup" element={<CampaignSetupPage />} />
          <Route path="karkunan" element={<KarkunanPage />} />
          <Route path="karkunan/:karkunId" element={<KarkunProfilePage />} />
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
