import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminTopBar } from '@/components/layout/AdminTopBar'
import { DigitalRafeeqLauncher } from '@/features/digitalRafeeq/launcher'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import { useRepositoryHydration } from '@/hooks/useRepositoryHydration'
import {
  AdminCommandCenterProvider,
  useAdminCommandCenter,
} from '@/providers/AdminCommandCenterProvider'

function AdminLayoutShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const snapshot = useAdminCommandCenter()
  const alertsReady = useRepositoryHydration()
  useKeyboardInset()

  useEffect(() => {
    if (!mobileNavOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileNavOpen])

  return (
    // KC-0057: viewport-bounded shell so <main> is the real wheel scrollport.
    // Without h-svh + min-h-0, overflow-y-auto + overscroll-y-contain trapped wheel events.
    <div className="kc-shell-canvas flex h-svh max-h-svh overflow-hidden">
      <AdminSidebar
        variant="desktop"
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
      />

      {mobileNavOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div
        id="admin-mobile-nav"
        className={[
          'fixed inset-y-0 start-0 z-40 w-[min(20rem,100%)] transform kc-shell-rail transition-transform lg:hidden',
          mobileNavOpen
            ? 'pointer-events-auto translate-x-0'
            : 'pointer-events-none -translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal={mobileNavOpen ? true : undefined}
        aria-label="منتظم نیویگیشن"
        aria-hidden={!mobileNavOpen}
        {...(!mobileNavOpen ? { inert: true } : {})}
      >
        <AdminSidebar
          variant="drawer"
          collapsed={false}
          onToggle={() => setMobileNavOpen(false)}
          onNavigate={() => setMobileNavOpen(false)}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AdminTopBar
          alertCount={snapshot.alerts.length}
          alertsReady={alertsReady}
          mobileNavOpen={mobileNavOpen}
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
