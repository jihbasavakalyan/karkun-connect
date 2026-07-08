import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { DEFAULT_DEMO_RUKN_ID } from '@/constants/demoRukn'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import {
  AvailableKarkunRow,
  ConnectKarkunConfirmModal,
  KarkunSearchField,
} from '@/components/relationship'
import { humanizeConnectionConfirmed } from '@/lib/relationshipPresentation'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export function AvailableKarkunPage() {
  const { user } = useAuth()
  const ruknId = user?.ruknId ?? DEFAULT_DEMO_RUKN_ID
  const { getAvailableKarkunan, assignKarkun } = useAssignmentEngine()
  const availableKarkunan = getAvailableKarkunan()
  const [query, setQuery] = useState('')
  const [pendingKarkun, setPendingKarkun] = useState<KarkunRegistryRecord | null>(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const filtered = useMemo(() => {
    return availableKarkunan.filter((karkun) => matchesKarkunRegistrySearch(karkun, query))
  }, [availableKarkunan, query])

  const handleConfirmConnect = () => {
    if (!pendingKarkun) return
    const result = assignKarkun(pendingKarkun.id, ruknId, 'Rukn')
    if (!result.success) {
      setError(result.error)
      return
    }
    setSuccessMessage(humanizeConnectionConfirmed(result.assignment?.assignmentNumber))
    setPendingKarkun(null)
    setError('')
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <div className="relationship-page space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-text-heading">Connect Karkun</h1>
        <p className="mt-2 text-secondary">
          Search, connect, and keep going — {availableKarkunan.length} Karkun
          {availableKarkunan.length === 1 ? '' : 's'} ready to connect.
        </p>
      </header>

      <KarkunSearchField
        id="available-karkun-search"
        value={query}
        onChange={setQuery}
        resultCount={query.trim() ? filtered.length : undefined}
        sticky
      />

      {successMessage && (
        <div
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {availableKarkunan.length === 0 ? (
        <div className="home-card text-center">
          <p className="text-secondary">No Karkun is available to connect right now.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="home-card text-center">
          <p className="text-secondary">No Karkun matches “{query}”.</p>
        </div>
      ) : (
        <ul className="relationship-row-list">
          {filtered.map((karkun) => (
            <li key={karkun.id}>
              <AvailableKarkunRow
                karkun={karkun}
                onConnect={() => {
                  setPendingKarkun(karkun)
                  setError('')
                  setSuccessMessage('')
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <ConnectKarkunConfirmModal
        isOpen={pendingKarkun !== null}
        karkun={pendingKarkun}
        error={error}
        onClose={() => {
          setPendingKarkun(null)
          setError('')
        }}
        onConfirm={handleConfirmConnect}
      />
    </div>
  )
}
