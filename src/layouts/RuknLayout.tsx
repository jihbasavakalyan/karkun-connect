import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
import { isRuknCampaignConnectionPath } from '@/lib/ruknCampaignConnectionPath'

/**
 * Frozen Rukn primary navigation (product decision).
 * Weekly Ijtema + Bait-ul-Maal are primary destinations — not Home-only sections.
 * Communication remains the final primary destination; Record stays route-only.
 */
const navItems: { label: string; icon: IconName; to: string; end: boolean }[] = [
  { label: 'Home', icon: 'home', to: ROUTES.RUKN, end: true },
  { label: 'Karkun', icon: 'users', to: ROUTES.RUKN_KARKUN, end: false },
  { label: 'Meeqati Mansooba', icon: 'flag', to: ROUTES.RUKN_MEQATI_MANSOOBA, end: false },
  { label: 'Responsibilities', icon: 'clipboard', to: ROUTES.RUKN_RESPONSIBILITIES, end: false },
  { label: 'Weekly Ijtema', icon: 'calendar', to: ROUTES.RUKN_WEEKLY_IJTEMA, end: false },
  { label: 'Bait-ul-Maal', icon: 'handshake', to: ROUTES.RUKN_MONTHLY_BAITUL_MAAL, end: false },
  { label: 'Communication', icon: 'message', to: ROUTES.RUKN_COMMUNICATION, end: false },
]

/**
 * KC-0102A — Progressive Rukn shell: header + bottom nav always render.
 * KC-EVO-012A — Home mounts during critical hydrate with section skeletons;
 * Karkun / visit stay Outlet-blocked until critical ready.
 * Connection hydrate failures stay on campaign-connection routes only so
 * navigation and Logout remain usable. Failures never invent a 0-connected state.
 */
export function RuknLayout() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const isHydrated = useRepositoryHydration()
  const hydration = useRepositoryHydrationStatus()
  const { assignmentVersion } = useAssignmentEngine()
  const { pathname } = useLocation()
  const connectionScoped = isRuknCampaignConnectionPath(pathname)
  const homePath = (pathname.replace(/\/+$/, '') || '/') === ROUTES.RUKN
  const blockConnectionOutlet = connectionScoped && !homePath && !isHydrated && !hydration.failed
  const timeline = isHydrated ? getCampaignTimeline() : null
  const campaignPeriodActive = timeline?.status === 'active'
  const campaignName = !isHydrated
    ? '…'
    : campaignPeriodActive
      ? getActiveCampaignName()
      : 'کارکن کنیکٹ'
  const duration = isHydrated && campaignPeriodActive ? formatActiveCampaignDuration() : ''
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

  return (
    <div className="native-shell kc-shell-canvas flex min-h-svh flex-col">
      <header className="border-b border-kc-shell-border pt-[env(safe-area-inset-top)]">
        <div className="kc-shell-rail px-3 py-2 lg:px-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <Logo size="sm" variant="light" />
            <PortalAuthActions portalLabel="Rukn Portal" tone="on-dark" />
          </div>
          <div className="mx-auto max-w-5xl">
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-kc-shell-text">{campaignName}</p>
              {campaignPeriodActive && timeline ? (
                <EnterpriseBadge variant="success">{timeline.dayLabel}</EnterpriseBadge>
              ) : null}
              {duration ? <p className="text-xs text-kc-shell-text-muted">{duration}</p> : null}
            </div>
          </div>
        </div>
      </header>

      <main className="native-main mx-auto w-full max-w-5xl flex-1 px-3 py-2 lg:px-6 lg:py-3">
        {hydration.failed && connectionScoped ? (
          <section className="kc-panel rounded-xl p-6" role="alert">
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
        ) : blockConnectionOutlet ? (
          <HomePageSkeleton />
        ) : (
          <RuknCommandCenterProvider>
            <Outlet />
          </RuknCommandCenterProvider>
        )}
      </main>

      <nav
        className="native-bottom-nav kc-shell-topbar fixed inset-x-0 bottom-0 z-40 border-t px-1.5 pt-1"
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
                    'native-nav-item flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 text-center text-[10px] font-semibold leading-snug transition-colors duration-200 sm:text-[11px]',
                    isActive
                      ? 'kc-rukn-nav-current native-nav-item-active'
                      : 'text-secondary hover:bg-kc-canvas hover:text-kc-shell-ink',
                  ].join(' ')
                }
              >
                <Icon name={item.icon} size="lg" className="text-current" />
                <span className="max-w-full truncate px-0.5">{item.label}</span>
                <span className="kc-rukn-nav-indicator h-0.5 w-5 rounded-full bg-transparent" aria-hidden="true" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <ExecutionSaveToast />
      <DigitalRafeeqLauncher role="rukn" offsetClassName="digital-rafeeq-fab-offset-rukn" />
    </div>
  )
}
