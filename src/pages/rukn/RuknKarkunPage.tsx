import type { KeyboardEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES, ruknKarkunPath } from '@/constants/routes'
import { RuknAddPersonQuickActions } from '@/components/relationship/RuknAddPersonQuickActions'
import { PageShell } from '@/components/ui'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useAuth } from '@/hooks/useAuth'
import { AvailableKarkunPage } from '@/pages/rukn/AvailableKarkunPage'
import { MyKarkunPage } from '@/pages/rukn/MyKarkunPage'

const MINE_TAB_ID = 'rukn-karkun-tab-mine'
const AVAILABLE_TAB_ID = 'rukn-karkun-tab-available'
const MINE_PANEL_ID = 'rukn-karkun-panel-mine'
const AVAILABLE_PANEL_ID = 'rukn-karkun-panel-available'

/**
 * UX merge of Connect + Connected. Existing pages/data remain the source of truth.
 * Increment 10 — presentation of the existing Karkun workspace only.
 */
export function RuknKarkunPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') === 'available' ? 'available' : 'mine'

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  const onTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = view === 'mine' ? 'available' : 'mine'
    navigate(ruknKarkunPath(next))
  }

  return (
    <PageShell variant="narrow" className="app-screen rukn-karkun-workspace">
      <header className="app-screen-header">
        <h1 className="app-screen-title">Karkun</h1>
        <p className="app-screen-subtitle">
          Your connected Karkuns, and who is available to connect. Journey, Call, WhatsApp, Visit,
          Schedule, and Review stay on each person.
        </p>
      </header>

      <div
        className="rukn-karkun-tabs"
        role="tablist"
        aria-label="Karkun lists"
        onKeyDown={onTabListKeyDown}
      >
        <Link
          id={MINE_TAB_ID}
          to={ruknKarkunPath('mine')}
          role="tab"
          aria-selected={view === 'mine'}
          aria-controls={MINE_PANEL_ID}
          tabIndex={view === 'mine' ? 0 : -1}
          className={view === 'mine' ? 'rukn-karkun-tab rukn-karkun-tab-current' : 'rukn-karkun-tab'}
        >
          My Karkun
        </Link>
        <Link
          id={AVAILABLE_TAB_ID}
          to={ruknKarkunPath('available')}
          role="tab"
          aria-selected={view === 'available'}
          aria-controls={AVAILABLE_PANEL_ID}
          tabIndex={view === 'available' ? 0 : -1}
          className={
            view === 'available' ? 'rukn-karkun-tab rukn-karkun-tab-current' : 'rukn-karkun-tab'
          }
        >
          Available
        </Link>
      </div>

      {view === 'mine' ? (
        <div
          role="tabpanel"
          id={MINE_PANEL_ID}
          aria-labelledby={MINE_TAB_ID}
        >
          <MyKarkunPage embedded />
        </div>
      ) : (
        <div
          role="tabpanel"
          id={AVAILABLE_PANEL_ID}
          aria-labelledby={AVAILABLE_TAB_ID}
        >
          <AvailableKarkunPage embedded />
        </div>
      )}

      <RuknAddPersonQuickActions
        ruknId={ruknId}
        tone="secondary"
        className="rukn-karkun-add"
      />
    </PageShell>
  )
}
