import { NavLink, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { ROUTES } from '@/constants/routes'
import { Logo } from '@/components/common/Logo'
import { PortalAuthActions } from '@/components/layout/PortalAuthActions'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'
import {
  formatActiveCampaignDuration,
  getActiveCampaignName,
  getCampaignTimeline,
} from '@/services/campaignService'
import { EnterpriseBadge } from '@/components/enterprise'
import { DigitalRafeeqLauncher } from '@/features/digitalRafeeq/launcher'
import { ExecutionSaveToast } from '@/components/execution/ExecutionSaveToast'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import { RuknCommandCenterProvider } from '@/providers/RuknCommandCenterProvider'
import {
  useRepositoryHydration,
  useRepositoryHydrationStatus,
} from '@/hooks/useRepositoryHydration'
import { useAuth } from '@/hooks/useAuth'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { HomePageSkeleton } from '@/components/ui'
import { traceKc0100ConnectionConsistency } from '@/lib/debug/kc0100ConnectionConsistencyTrace'

/** KC-0093 — Communication is primary workspace; Record remains route-only (workflow, not destination). */
const navItems: { label: string; icon: IconName; to: string; end: boolean }[] = [
  { label: 'Home', icon: 'home', to: ROUTES.RUKN, end: true },
  { label: 'Connect', icon: 'search', to: ROUTES.RUKN_AVAILABLE_KARKUN, end: false },
  { label: 'Connected', icon: 'users', to: ROUTES.RUKN_MY_KARKUN, end: false },
  { label: 'Communication', icon: 'message', to: ROUTES.RUKN_COMMUNICATION, end: false },
  { label: 'Ijtema', icon: 'calendar', to: ROUTES.RUKN_WEEKLY_IJTEMA, end: false },
  { label: 'Baitul Maal', icon: 'check', to: ROUTES.RUKN_MONTHLY_BAITUL_MAAL, end: false },
]

export function RuknLayout() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const isHydrated = useRepositoryHydration()
  const hydration = useRepositoryHydrationStatus()
  const { assignmentVersion } = useAssignmentEngine()
  const campaignName = getActiveCampaignName()
  const duration = formatActiveCampaignDuration()
  const timeline = getCampaignTimeline()
  useKeyboardInset()

  // KC-0100 — trace Auth → counts whenever hydrate or assignments change.
  useEffect(() => {
    if (!isHydrated || !ruknId) return
    traceKc0100ConnectionConsistency({
      stage: 'rukn-layout.render',
      authUser: user,
      resolvedRuknId: ruknId,
    })
  }, [isHydrated, ruknId, user, assignmentVersion])

  if (hydration.failed) {
    return (
      <div className="native-shell flex min-h-svh flex-col bg-surface-muted">
        <header className="border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
          <div className="enterprise-gradient-hero px-3 py-2 text-white lg:px-4">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <Logo size="sm" variant="light" />
              <PortalAuthActions portalLabel="Rukn Portal" tone="on-dark" />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
          <section className="rounded-xl border border-border bg-surface p-6 shadow-card" role="alert">
            <h1 className="text-lg font-semibold text-text-heading">Unable to load your connections</h1>
            <p className="mt-2 text-sm text-secondary">
              Your Rukn workspace cannot load connection data until authorization and Firestore reads
              succeed. This prevents showing a false &quot;0 connected&quot; state.
            </p>
            {hydration.error ? (
              <p className="mt-2 text-xs text-secondary break-words">{hydration.error}</p>
            ) : null}
            <div className="mt-4">
              <PrimaryButton type="button" onClick={hydration.retry}>
                Retry
              </PrimaryButton>
            </div>
          </section>
        </main>
      </div>
    )
  }

  if (!isHydrated) {
    return (
      <div className="native-shell flex min-h-svh flex-col bg-surface-muted">
        <header className="border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
          <div className="enterprise-gradient-hero px-3 py-2 text-white lg:px-4">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <Logo size="sm" variant="light" />
              <PortalAuthActions portalLabel="Rukn Portal" tone="on-dark" />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-3">
          <HomePageSkeleton />
        </main>
      </div>
    )
  }

  return (
    <RuknCommandCenterProvider>
    <div className="native-shell flex min-h-svh flex-col bg-surface-muted">
      <header className="border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
        <div className="enterprise-gradient-hero px-3 py-2 text-white lg:px-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <Logo size="sm" variant="light" />
            <PortalAuthActions portalLabel="Rukn Portal" tone="on-dark" />
          </div>
          <div className="mx-auto max-w-5xl">
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{campaignName}</p>
              {timeline && (
                <EnterpriseBadge variant={timeline.status === 'active' ? 'success' : 'info'}>
                  {timeline.dayLabel}
                </EnterpriseBadge>
              )}
              <p className="text-xs text-white/80">{duration}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="native-main mx-auto w-full max-w-5xl flex-1 px-3 py-3 lg:px-6 lg:py-5">
        <Outlet />
      </main>

      <nav
        className="native-bottom-nav fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 px-2 pt-2 shadow-[0_-4px_20px_rgb(0_0_0/0.06)] backdrop-blur-md"
        aria-label="Rukn navigation"
      >
        <ul className="mx-auto flex max-w-5xl items-stretch justify-around">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'native-nav-item flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-tight transition-all duration-200 sm:text-xs',
                    isActive
                      ? 'bg-primary-muted text-primary native-nav-item-active'
                      : 'text-secondary hover:bg-surface-muted hover:text-text-heading',
                  ].join(' ')
                }
              >
                <Icon name={item.icon} size="lg" className="text-current" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <ExecutionSaveToast />
      <DigitalRafeeqLauncher role="rukn" offsetClassName="digital-rafeeq-fab-offset-rukn" />
    </div>
    </RuknCommandCenterProvider>
  )
}
