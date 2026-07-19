import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminTopBar } from '@/components/layout/AdminTopBar'
import { DigitalRafeeqLauncher } from '@/features/digitalRafeeq/launcher'
import {
  AdminCommandCenterProvider,
  useAdminCommandCenter,
} from '@/providers/AdminCommandCenterProvider'

function AdminLayoutShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const snapshot = useAdminCommandCenter()

  return (
    // KC-0057: viewport-bounded shell so <main> is the real wheel scrollport.
    // Without h-svh + min-h-0, overflow-y-auto + overscroll-y-contain trapped wheel events.
    <div className="flex h-svh max-h-svh overflow-hidden bg-surface-muted">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
      />

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={[
          'fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar transition-transform lg:hidden',
          mobileNavOpen
            ? 'pointer-events-auto translate-x-0'
            : 'pointer-events-none -translate-x-full',
        ].join(' ')}
      >
        <AdminSidebar collapsed={false} onToggle={() => setMobileNavOpen(false)} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AdminTopBar
          alertCount={snapshot.alerts.length}
          onMenuToggle={() => setMobileNavOpen((value) => !value)}
        />
        <main className="native-admin-main min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 lg:p-6">
          <Outlet />
        </main>
      </div>

      <DigitalRafeeqLauncher role="administrator" />
    </div>
  )
}

export function AdminLayout() {
  return (
    <AdminCommandCenterProvider>
      <AdminLayoutShell />
    </AdminCommandCenterProvider>
  )
}
